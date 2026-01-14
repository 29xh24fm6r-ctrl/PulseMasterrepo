import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { createAdminClient } from "../../_lib/env";

async function transcribeRecordingStub(_recordingSid: string): Promise<{ lines: string[]; summary: string }> {
    // Phase 2 stub. Replace with your real transcription.
    return {
        lines: [
            "Pulse: Hello, this is Pulse Voice.",
            "System: (call audio captured by recording)",
        ],
        summary: "Phase 2 stub transcription recorded. Replace transcribeRecordingStub() with real provider.",
    };
}

export async function POST(_req: NextRequest) {
    const supabase = createAdminClient();
    const { data: sessions, error } = await supabase
        .from("pulse_call_sessions")
        .select("id, twilio_recording_sid")
        .eq("transcript_status", "PENDING")
        .not("twilio_recording_sid", "is", null)
        .limit(3);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!sessions || sessions.length === 0) return NextResponse.json({ ok: true, processed: 0 });

    let processed = 0;

    for (const s of sessions) {
        const recSid = s.twilio_recording_sid as string;

        await supabase.from("pulse_call_sessions").update({ transcript_status: "IN_PROGRESS" }).eq("id", s.id);
        await supabase.from("pulse_call_events").insert({
            call_session_id: s.id,
            event_type: "TRANSCRIPT_START",
            payload: { recordingSid: recSid },
        });

        const result = await transcribeRecordingStub(recSid);

        for (const line of result.lines) {
            await supabase.from("pulse_call_transcripts").insert({
                call_session_id: s.id,
                speaker: line.startsWith("Pulse:") ? "pulse" : "system",
                content: line,
                confidence: 0.7,
            });
        }

        await supabase
            .from("pulse_call_sessions")
            .update({ transcript_status: "COMPLETED", transcript_summary: result.summary })
            .eq("id", s.id);

        await supabase.from("pulse_call_events").insert({
            call_session_id: s.id,
            event_type: "TRANSCRIPT_COMPLETE",
            payload: { lines: result.lines.length },
        });

        processed++;
    }

    return NextResponse.json({ ok: true, processed });
}
