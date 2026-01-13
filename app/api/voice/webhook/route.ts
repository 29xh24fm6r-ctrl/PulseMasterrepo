import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function env(name: string) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env: ${name}`);
    return v;
}

const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

function twiml(xml: string) {
    return new NextResponse(xml, {
        status: 200,
        headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
}

type IvrStep =
    | { type: "DTMF"; digits: string; label?: string }
    | { type: "WAIT"; ms: number; label?: string };

function safeParsePlan(plan: any): IvrStep[] {
    if (!plan || !Array.isArray(plan)) return [];
    const out: IvrStep[] = [];
    for (const s of plan) {
        if (s?.type === "DTMF" && typeof s.digits === "string") out.push({ type: "DTMF", digits: s.digits, label: s.label });
        if (s?.type === "WAIT" && typeof s.ms === "number") out.push({ type: "WAIT", ms: s.ms, label: s.label });
    }
    return out;
}

export async function POST(req: NextRequest) {
    const form = await req.formData();
    const CallSid = String(form.get("CallSid") || "");
    const From = String(form.get("From") || "");
    const To = String(form.get("To") || "");

    // locate session
    const { data: session, error } = await supabase
        .from("pulse_call_sessions")
        .select("id, ivr_mode, ivr_plan, ivr_step, intent_summary")
        .eq("twilio_call_sid", CallSid)
        .maybeSingle();

    if (error) return twiml(`<Response><Say>System error.</Say></Response>`);
    if (!session) {
        // Fallback if session not found (should be rare)
        return twiml(`<Response><Say>Hello, this is Pulse Voice.</Say></Response>`);
    }

    // Log webhook hit
    await supabase.from("pulse_call_events").insert({
        call_session_id: session.id,
        event_type: "TWILIO_WEBHOOK",
        payload: { CallSid, From, To },
    });

    // IVR plan execution
    const plan = safeParsePlan(session.ivr_plan);

    // Phase 3: Dynamic Mode (Real-time Stream)
    if (session.mode === 'DYNAMIC' || session.mode === 'CONVERSATION') {
        const streamWssUrl = process.env.PULSE_VOICE_STREAM_WSS_URL;
        if (!streamWssUrl) {
            console.error("Missing PULSE_VOICE_STREAM_WSS_URL");
            return twiml(`<Response><Say>System configuration error.</Say></Response>`);
        }

        // We append query params so the Gateway knows who is calling
        const streamUrl = `${streamWssUrl}?callSessionId=${session.id}&callSid=${CallSid}`;

        await supabase.from("pulse_call_events").insert({
            call_session_id: session.id,
            event_type: "STREAM_START_REQUESTED",
            payload: { streamUrl },
        });

        await supabase
            .from("pulse_call_sessions")
            .update({ stream_status: 'REQUESTED' })
            .eq("id", session.id);

        return twiml(`
<Response>
  <Say>One moment, connecting you to Pulse.</Say>
  <Connect>
    <Stream url="${streamUrl}" />
  </Connect>
  <!-- Keep call alive if stream disconnects or before it connects -->
  <Pause length="10" />
</Response>`.trim());
    }

    // Phase 2: Macro IVR
    if (session.ivr_mode && plan.length > 0) {
        const idx = session.ivr_step ?? 0;
        const step = plan[idx];

        if (!step) {
            // finished
            await supabase.from("pulse_call_events").insert({
                call_session_id: session.id,
                event_type: "IVR_PLAN_COMPLETE",
                payload: { steps: plan.length },
            });

            return twiml(`
<Response>
  <Say>IVR navigation complete. Connecting.</Say>
  <Pause length="1"/>
</Response>`.trim());
        }

        // advance pointer now (idempotency for Twilio retries is a later hardening step)
        await supabase
            .from("pulse_call_sessions")
            .update({ ivr_step: idx + 1 })
            .eq("id", session.id);

        await supabase.from("pulse_call_events").insert({
            call_session_id: session.id,
            event_type: "IVR_STEP",
            payload: { idx, step },
        });

        if (step.type === "WAIT") {
            const seconds = Math.max(1, Math.min(30, Math.round(step.ms / 1000)));
            return twiml(`
<Response>
  <Pause length="${seconds}"/>
  <Redirect method="POST">/api/voice/webhook</Redirect>
</Response>`.trim());
        }

        // DTMF: Twilio supports <Play digits="">
        return twiml(`
<Response>
  <Play digits="${step.digits}"/>
  <Pause length="1"/>
  <Redirect method="POST">/api/voice/webhook</Redirect>
</Response>`.trim());
    }

    // Default non-IVR: Phase 1 greeting
    await supabase.from("pulse_call_transcripts").insert({
        call_session_id: session.id,
        speaker: "pulse",
        content: "Hello, this is Pulse Voice. This call is a Phase 2 verification run.",
        confidence: 1,
    });

    return twiml(`
<Response>
  <Say>Hello, this is Pulse Voice. This call is a Phase 2 verification run.</Say>
  <Pause length="1"/>
</Response>`.trim());
}
