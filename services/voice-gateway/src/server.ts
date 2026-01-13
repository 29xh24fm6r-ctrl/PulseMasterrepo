import { WebSocketServer } from "ws";
import { env } from "./lib/env.js";
import { supabase } from "./lib/supabase.js";
import { isTwilioStreamEvent } from "./types/twilioStream.js";
import { createDeepgramStream } from "./stt/deepgramStream.js";
import { CallOrchestrator } from "./orchestrator/callOrchestrator.js";

const PORT = Number(env("PORT"));

const wss = new WebSocketServer({ port: PORT });

console.log(`[voice-gateway] ws listening on :${PORT}`);

wss.on("connection", async (ws, req) => {
    try {
        const url = new URL(req.url || "", `http://localhost:${PORT}`);
        const callSessionId = url.searchParams.get("callSessionId") || "";
        const callSid = url.searchParams.get("callSid") || "";

        if (!callSessionId || !callSid) {
            ws.close();
            return;
        }

        // load intentSummary for this call
        const { data: session, error } = await supabase
            .from("pulse_call_sessions")
            .select("id, intent_summary")
            .eq("id", callSessionId)
            .maybeSingle();

        if (error || !session) {
            ws.close();
            return;
        }

        // mark stream connected
        await supabase.from("pulse_call_events").insert({
            call_session_id: callSessionId,
            event_type: "STREAM_CONNECTED",
            payload: { callSid }
        });

        // STT stream
        const stt = createDeepgramStream();
        const orch = new CallOrchestrator({
            callSessionId,
            callSid,
            intentSummary: session.intent_summary || "Navigate IVR"
        });

        stt.onSegment((seg) => {
            orch.onSttSegment(seg).catch(() => { });
        });

        ws.on("message", async (raw) => {
            let msg: any;
            try {
                msg = JSON.parse(raw.toString());
            } catch {
                return;
            }
            if (!isTwilioStreamEvent(msg)) return;

            if (msg.event === "start") {
                await supabase.from("pulse_call_sessions").update({
                    stream_sid: msg.start.streamSid,
                    stream_status: "LIVE"
                }).eq("id", callSessionId);

                await supabase.from("pulse_call_events").insert({
                    call_session_id: callSessionId,
                    event_type: "STREAM_START",
                    payload: { streamSid: msg.start.streamSid, callSid: msg.start.callSid }
                });
                return;
            }

            if (msg.event === "media") {
                const b64 = msg.media.payload;
                if (!b64) return;
                const audio = Buffer.from(b64, "base64");
                stt.writeAudioMulaw8k(audio);
                return;
            }

            if (msg.event === "stop") {
                await supabase.from("pulse_call_events").insert({
                    call_session_id: callSessionId,
                    event_type: "STREAM_STOP",
                    payload: { streamSid: msg.stop.streamSid }
                });
                stt.close();
                ws.close();
                return;
            }
        });

        ws.on("close", async () => {
            stt.close();
            await supabase.from("pulse_call_sessions").update({
                stream_status: "CLOSED"
            }).eq("id", callSessionId);

            await supabase.from("pulse_call_events").insert({
                call_session_id: callSessionId,
                event_type: "STREAM_CLOSED",
                payload: { callSid }
            });
        });
    } catch {
        try { ws.close(); } catch { }
    }
});
