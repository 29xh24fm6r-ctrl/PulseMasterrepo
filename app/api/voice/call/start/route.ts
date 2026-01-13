import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createClient } from "@supabase/supabase-js";

type VoiceMode = "MACRO" | "DYNAMIC" | "CONVERSATION";
type StartBody = {
    targetPhone: string;
    taskType: string;
    intentSummary?: string;
    mode?: VoiceMode;
    ivrPlan?: Array<{ type: "DTMF" | "WAIT"; digits?: string; ms?: number; label?: string }>;
};

// ---------- helpers ----------
function getEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var: ${name}`);
    return v;
}

function isDev() {
    return process.env.NODE_ENV !== "production";
}

function safeJson(err: unknown) {
    if (err instanceof Error) {
        return { message: err.message, stack: err.stack };
    }
    return { message: String(err) };
}

function requireHeader(req: NextRequest, name: string): string {
    const v = req.headers.get(name);
    if (!v) throw new Error(`Missing required header: ${name}`);
    return v;
}

function normalizeBaseUrl(raw: string): string {
    // allow "https://x" only
    if (!raw.startsWith("https://")) {
        throw new Error(`x-pulse-webhook-url must start with https:// (got: ${raw})`);
    }
    return raw.replace(/\/+$/, "");
}

function toWssFromHttps(httpsUrl: string) {
    return httpsUrl.replace(/^https:\/\//, "wss://").replace(/\/+$/, "");
}

// ---------- main ----------
export async function POST(req: NextRequest) {
    const startedAt = Date.now();

    try {
        // Auth / dev-bypass gate
        const devBypass = req.headers.get("x-dev-bypass-auth") === "true";
        if (!isDev() && devBypass) {
            return NextResponse.json({ ok: false, error: "Dev bypass not allowed in production" }, { status: 403 });
        }
        // NOTE: In prod, replace this with your Clerk auth check.
        // For now, if no dev bypass, fail fast with explicit error.
        if (!devBypass) {
            return NextResponse.json(
                { ok: false, error: "Auth required (use x-dev-bypass-auth: true in dev)" },
                { status: 401 }
            );
        }

        // Parse body
        const body = (await req.json()) as StartBody;

        if (!body?.targetPhone || typeof body.targetPhone !== "string") {
            throw new Error("Missing targetPhone");
        }
        if (!body?.taskType || typeof body.taskType !== "string") {
            throw new Error("Missing taskType");
        }

        const mode: VoiceMode = (body.mode || "MACRO") as VoiceMode;

        // Public base URL for Twilio callbacks + webhook
        const publicBase = normalizeBaseUrl(requireHeader(req, "x-pulse-webhook-url"));

        // For Dynamic mode, you MUST have the gateway stream URL configured in root env
        // This is what your /api/voice/webhook TwiML uses.
        // (We validate it here so you get a clean error body instead of a crash.)
        if (mode === "DYNAMIC") {
            const streamWss = process.env.PULSE_VOICE_STREAM_WSS_URL;
            if (!streamWss) {
                throw new Error("Missing env var: PULSE_VOICE_STREAM_WSS_URL (required for mode=DYNAMIC)");
            }
            if (!streamWss.startsWith("wss://")) {
                throw new Error(`PULSE_VOICE_STREAM_WSS_URL must start with wss:// (got: ${streamWss})`);
            }
        }

        // Required env
        const TWILIO_ACCOUNT_SID = getEnv("TWILIO_ACCOUNT_SID");
        const TWILIO_AUTH_TOKEN = getEnv("TWILIO_AUTH_TOKEN");
        const TWILIO_FROM_NUMBER = getEnv("TWILIO_FROM_NUMBER");

        const SUPABASE_URL = getEnv("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Lazy Twilio init (avoids boot crashes)
        const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

        // Create call session first
        const sessionInsert = await supabase
            .from("pulse_call_sessions")
            .insert({
                owner_user_id: "dev-bypass",
                target_phone: body.targetPhone,
                task_type: body.taskType,
                status: "PLANNED",
                current_state: "DIALING",
                intent_summary: body.intentSummary || null,
                mode,
                ivr_mode: Array.isArray(body.ivrPlan) && body.ivrPlan.length > 0,
                ivr_plan: Array.isArray(body.ivrPlan) ? body.ivrPlan : null,
                ivr_step: 0
            })
            .select("id")
            .single();

        if (sessionInsert.error) {
            throw new Error(`Supabase insert pulse_call_sessions failed: ${sessionInsert.error.message}`);
        }

        const callSessionId = sessionInsert.data.id as string;

        // Build callback URLs (Twilio must be able to reach these)
        const webhookUrl = `${publicBase}/api/voice/webhook`;     // TwiML
        const statusUrl = `${publicBase}/api/voice/status`;       // status callbacks
        const recordingUrl = `${publicBase}/api/voice/recording`; // recording callbacks

        // Create the call
        // IMPORTANT: We point Twilio at your TwiML webhook. That webhook will stream to gateway if mode=DYNAMIC.
        let call;
        try {
            call = await client.calls.create({
                to: body.targetPhone,
                from: TWILIO_FROM_NUMBER,
                url: webhookUrl,
                method: "POST",

                statusCallback: statusUrl,
                statusCallbackMethod: "POST",
                statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],

                record: true,
                recordingStatusCallback: recordingUrl,
                recordingStatusCallbackMethod: "POST"
            });
        } catch (e: any) {
            // Update session to FAILED with reason
            await supabase
                .from("pulse_call_sessions")
                .update({
                    status: "FAILED",
                    last_twilio_error: e?.message || "Twilio call create failed"
                })
                .eq("id", callSessionId);

            throw new Error(`Twilio call create failed: ${e?.message || String(e)}`);
        }

        // Update session with Twilio CallSid + mark in progress
        await supabase
            .from("pulse_call_sessions")
            .update({
                twilio_call_sid: call.sid,
                status: "IN_PROGRESS",
                current_state: "DIALING",
                last_twilio_status: "initiated"
            })
            .eq("id", callSessionId);

        await supabase.from("pulse_call_events").insert({
            call_session_id: callSessionId,
            event_type: "CALL_CREATED",
            payload: {
                callSid: call.sid,
                to: body.targetPhone,
                from: TWILIO_FROM_NUMBER,
                webhookUrl,
                statusUrl,
                recordingUrl,
                mode
            }
        });

        return NextResponse.json({
            ok: true,
            callSessionId,
            twilioCallSid: call.sid,
            mode,
            ms: Date.now() - startedAt
        });
    } catch (err) {
        // Always return a useful JSON error body (no more empty 500s)
        console.error("[voice/call/start] ERROR", err);

        return NextResponse.json(
            {
                ok: false,
                error: safeJson(err),
                hint:
                    "Check: TWILIO_* envs, SUPABASE_* envs, PULSE_VOICE_STREAM_WSS_URL for DYNAMIC, and x-pulse-webhook-url header must be https://",
                ms: Date.now() - startedAt
            },
            { status: 500 }
        );
    }
}
