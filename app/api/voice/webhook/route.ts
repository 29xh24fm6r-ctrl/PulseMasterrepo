import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { createAdminClient } from "../_lib/env";

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
    // 1. Guaranteed TwiML fallback helper
    const fatalError = (msg: string) => twiml(`<Response><Say voice="Polly.Matthew-Neural">Critical Error: ${msg}</Say></Response>`);

    try {
        // 2. Safely parse FormData
        let CallSid = "";
        let From = "";
        let To = "";

        try {
            const form = await req.formData();
            CallSid = String(form.get("CallSid") || "");
            From = String(form.get("From") || "");
            To = String(form.get("To") || "");
        } catch (e) {
            console.error("FormData Parse Error:", e);
            // Even if parsing fails, we might still want to return something? 
            // But if we can't get CallSid, we can't look up session.
            return fatalError("Invalid Webhook Data.");
        }

        // 3. Determine session lookup method
        const url = new URL(req.url);
        const sessionIdFn = url.searchParams.get("session_id");

        const supabase = createAdminClient();

        let query = supabase
            .from("pulse_call_sessions")
            .select("id, ivr_mode, ivr_plan, ivr_step, intent_summary, mode");

        if (sessionIdFn) {
            query = query.eq("id", sessionIdFn);
        } else {
            query = query.eq("twilio_call_sid", CallSid);
        }

        const { data: session, error } = await query.maybeSingle();

        if (error) {
            console.error("Webhook DB Error:", error);
            return fatalError("Database System Error.");
        }
        if (!session) {
            // Fallback if session not found (should be rare)
            return twiml(`<Response><Say voice="Polly.Matthew-Neural">Hello, this is Pulse Voice.</Say></Response>`);
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
                return fatalError("Missing Stream Configuration.");
            }

            // HARDENING: Force remove any trailing slash or specific paths that might be in env
            const cleanWssBase = streamWssUrl.replace(/\/twilio-media\/?$/, "").replace(/\/+$/, "");

            // We append query params so the Gateway knows who is calling
            const streamUrl = `${cleanWssBase}?callSessionId=${session.id}&callSid=${CallSid}`;
            const xmlSafeStreamUrl = streamUrl.replace(/&/g, "&amp;");

            console.log("[Webhook] Generating Stream TwiML:", { original: streamWssUrl, cleaned: cleanWssBase, streamUrl, xmlSafeStreamUrl });

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
  <Say voice="Polly.Matthew-Neural">One moment, connecting you to Pulse.</Say>
  <Connect>
    <Stream url="${xmlSafeStreamUrl}" />
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
  <Redirect method="POST">/api/voice/webhook?session_id=${session.id}</Redirect>
</Response>`.trim());
            }

            // DTMF: Twilio supports <Play digits="">
            return twiml(`
<Response>
  <Play digits="${step.digits}"/>
  <Pause length="1"/>
  <Redirect method="POST">/api/voice/webhook?session_id=${session.id}</Redirect>
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
  <Say voice="Polly.Matthew-Neural">Hello, this is Pulse Voice. This call is a Phase 2 verification run.</Say>
  <Pause length="1"/>
</Response>`.trim());
    } catch (err) {
        console.error("Webhook Crash:", err);
        return twiml(`<Response><Say voice="Polly.Matthew-Neural">Critical System Error.</Say></Response>`);
    }
}
