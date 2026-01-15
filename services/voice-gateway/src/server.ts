import { WebSocketServer } from "ws";
import { env } from "./lib/env.js";
import { Packetizer } from "./lib/audioUtils.js";
import { supabase } from "./lib/supabase.js";
import { isTwilioStreamEvent } from "./types/twilioStream.js";
import { createDeepgramStream } from "./stt/deepgramStream.js";
import { CallOrchestrator } from "./orchestrator/callOrchestrator.js";

import { generateSpeechOpenAI } from "./tts/openAiTTS.js";

const PORT = Number(env("PORT"));

const wss = new WebSocketServer({ port: PORT });

console.log(`[voice-gateway] ws listening on :${PORT}`);

wss.on("connection", async (ws, req) => {
    console.log("[VoiceGateway] New connection request:", req.url);
    try {
        const url = new URL(req.url || "", `http://localhost:${PORT}`);
        let callSessionId = url.searchParams.get("callSessionId");
        let callSid = url.searchParams.get("callSid");
        let streamSid: string | null = null;

        let orch: CallOrchestrator | null = null;
        let stt: ReturnType<typeof createDeepgramStream> | null = null;

        // Packetizer for 20ms framing (8kHz * 20ms = 160 samples = 160 bytes for mulaw)
        const packetizer = new Packetizer(160);

        const sendAudio = (audio: Buffer) => {
            if (!streamSid || ws.readyState !== 1) return; // 1 = OPEN

            // Add to packetizer and get framed chunks
            const frames = packetizer.add(audio);

            for (const frame of frames) {
                const payload = frame.toString("base64");
                const msg = {
                    event: "media",
                    streamSid,
                    media: { payload }
                };
                ws.send(JSON.stringify(msg));
            }
        };

        const initializeSession = async (sid: string, id: string) => {
            console.log(`[VoiceGateway] Initializing session ${id} for SID ${sid}`);

            // 1. Load Session
            const { data: session, error } = await supabase
                .from("pulse_call_sessions")
                .select("id, intent_summary, mode")
                .eq("id", id)
                .maybeSingle();

            if (error || !session) {
                console.error("[VoiceGateway] Session lookup failed:", { id, error });
                ws.close();
                return;
            }

            // 2. Mark Connected
            await supabase.from("pulse_call_events").insert({
                call_session_id: id,
                event_type: "STREAM_CONNECTED",
                payload: { callSid: sid }
            });

            // 3. Init STT & Orch
            stt = createDeepgramStream();
            orch = new CallOrchestrator({
                callSessionId: id,
                callSid: sid,
                intentSummary: session.intent_summary || "Navigate IVR",
                initialMode: session.mode,
                // Note: Ensure VoiceConfig is used if passed, but here we just init
                // The actual voice config is pulled from VoiceSettings singleton in Orchestrator

                // ... inside CallOrchestrator init ...
                onAudio: async (text, options) => {
                    console.log(`[VoiceGateway] TTS Request: "${text}"`);
                    try {
                        const audio = await generateSpeechOpenAI(text, options);
                        sendAudio(audio);
                    } catch (err) {
                        console.error("[VoiceGateway] TTS Error:", err);
                    }
                }
            });

            stt.onSegment((seg) => {
                orch?.onSttSegment(seg).catch(() => { });
            });

            stt.onSpeechStarted(() => {
                console.log(`[VoiceGateway] Speech Started (Interruption)`);
                packetizer.clear();
                // Send Twilio "Clear" event if we want to be aggressive, but clearing the buffer is 90% of the win
                ws.send(JSON.stringify({
                    event: "clear",
                    streamSid: streamSid
                }));
                orch?.notifyInterruption();
            });
        };

        // Try Early Binding
        if (callSessionId && callSid) {
            await initializeSession(callSid, callSessionId);
        } else {
            console.log("[VoiceGateway] Params missing. Waiting for 'start' event (Late Binding)...");
        }

        ws.on("message", async (raw) => {
            let msg: any;
            try { msg = JSON.parse(raw.toString()); } catch { return; }
            if (!isTwilioStreamEvent(msg)) return;

            if (msg.event === "start") {
                const sid = msg.start.callSid;
                streamSid = msg.start.streamSid;

                // LATE BINDING CHECK
                if (!orch) {
                    console.log(`[VoiceGateway] Late Binding triggered for SID: ${sid}`);
                    const { data: session } = await supabase
                        .from("pulse_call_sessions")
                        .select("id")
                        .eq("twilio_call_sid", sid)
                        .maybeSingle();

                    if (session) {
                        callSessionId = session.id;
                        callSid = sid;
                        await initializeSession(sid, session.id);
                    } else {
                        console.error("[VoiceGateway] Late Binding Failed: Session not found for SID", sid);
                        ws.close();
                        return;
                    }
                }

                if (callSessionId) {
                    await supabase.from("pulse_call_sessions").update({
                        stream_sid: streamSid,
                        stream_status: "LIVE"
                    }).eq("id", callSessionId);

                    await supabase.from("pulse_call_events").insert({
                        call_session_id: callSessionId,
                        event_type: "STREAM_START",
                        payload: { streamSid, callSid: sid }
                    });
                }
                return;
            }

            if (msg.event === "media") {
                if (stt && msg.media.payload) {
                    stt.writeAudioMulaw8k(Buffer.from(msg.media.payload, "base64"));
                }
                return;
            }

            if (msg.event === "stop") {
                if (callSessionId) {
                    await supabase.from("pulse_call_events").insert({
                        call_session_id: callSessionId,
                        event_type: "STREAM_STOP",
                        payload: { streamSid: msg.stop?.streamSid }
                    });
                }
                stt?.close();
                ws.close();
                return;
            }
        });

        ws.on("close", async () => {
            stt?.close();
            if (callSessionId) {
                await supabase.from("pulse_call_sessions").update({
                    stream_status: "CLOSED"
                }).eq("id", callSessionId);

                await supabase.from("pulse_call_events").insert({
                    call_session_id: callSessionId,
                    event_type: "STREAM_CLOSED",
                    payload: { callSid }
                });
            }
        });

    } catch {
        try { ws.close(); } catch { }
    }
});
