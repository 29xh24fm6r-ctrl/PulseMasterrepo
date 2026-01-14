import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { createAdminClient } from "../_lib/env";

function mapTwilioStatusToSessionStatus(twilioStatus?: string) {
    const s = (twilioStatus || "").toLowerCase();
    if (s === "in-progress" || s === "answered") return "IN_PROGRESS";
    if (s === "completed") return "COMPLETED";
    if (["failed", "busy", "no-answer", "canceled"].includes(s)) return "FAILED";
    return null;
}

export async function POST(req: NextRequest) {
    const supabase = createAdminClient();
    const form = await req.formData();
    const CallSid = String(form.get("CallSid") || "");
    const CallStatus = String(form.get("CallStatus") || "");
    const ErrorCode = String(form.get("ErrorCode") || "");
    const ErrorMessage = String(form.get("ErrorMessage") || "");

    console.log(`[TwilioStatus] ${CallSid} ${CallStatus} Code:${ErrorCode} Msg:${ErrorMessage}`);

    // Find call_session by twilio_call_sid
    const { data: session, error: findErr } = await supabase
        .from("pulse_call_sessions")
        .select("id,status")
        .eq("twilio_call_sid", CallSid)
        .maybeSingle();

    if (findErr) {
        return NextResponse.json({ ok: false, error: findErr.message }, { status: 500 });
    }
    if (!session) {
        // still return 200 so Twilio doesn't retry endlessly
        return NextResponse.json({ ok: true, ignored: true });
    }

    const nextStatus = mapTwilioStatusToSessionStatus(CallStatus);

    // Store raw callback
    await supabase.from("pulse_call_callbacks").insert({
        call_session_id: session.id,
        callback_type: "STATUS",
        payload: {
            CallSid,
            CallStatus,
            ErrorCode,
            ErrorMessage,
            received_at: new Date().toISOString(),
        },
    });

    // Update session
    if (nextStatus) {
        await supabase
            .from("pulse_call_sessions")
            .update({
                status: nextStatus,
                last_twilio_status: CallStatus || null,
                last_twilio_error: ErrorCode ? `${ErrorCode}${ErrorMessage ? `: ${ErrorMessage}` : ""}` : null,
                completed_at: nextStatus === "COMPLETED" || nextStatus === "FAILED" ? new Date().toISOString() : null,
            })
            .eq("id", session.id);

        await supabase.from("pulse_call_events").insert({
            call_session_id: session.id,
            event_type: "TWILIO_STATUS",
            payload: { CallSid, CallStatus, mapped_status: nextStatus, ErrorCode, ErrorMessage },
        });
    }

    return NextResponse.json({ ok: true });
}
