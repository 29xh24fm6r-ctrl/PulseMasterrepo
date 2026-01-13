import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function env(name: string) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env: ${name}`);
    return v;
}
const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

export async function POST(req: NextRequest) {
    const form = await req.formData();
    const CallSid = String(form.get("CallSid") || "");
    const RecordingSid = String(form.get("RecordingSid") || "");
    const RecordingStatus = String(form.get("RecordingStatus") || "");
    const RecordingUrl = String(form.get("RecordingUrl") || "");

    const { data: session } = await supabase
        .from("pulse_call_sessions")
        .select("id")
        .eq("twilio_call_sid", CallSid)
        .maybeSingle();

    if (!session) return NextResponse.json({ ok: true, ignored: true });

    await supabase.from("pulse_call_callbacks").insert({
        call_session_id: session.id,
        callback_type: "RECORDING",
        payload: { CallSid, RecordingSid, RecordingStatus, RecordingUrl },
    });

    await supabase
        .from("pulse_call_sessions")
        .update({
            twilio_recording_sid: RecordingSid || null,
            transcript_status: RecordingStatus === "completed" ? "PENDING" : "NONE",
        })
        .eq("id", session.id);

    await supabase.from("pulse_call_events").insert({
        call_session_id: session.id,
        event_type: "TWILIO_RECORDING",
        payload: { RecordingSid, RecordingStatus, RecordingUrl },
    });

    return NextResponse.json({ ok: true });
}
