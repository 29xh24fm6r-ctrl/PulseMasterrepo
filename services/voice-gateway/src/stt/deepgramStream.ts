import WebSocket from "ws";
import { env } from "../lib/env.js";
import type { SttSegment, SttStream } from "./types.js";

export function createDeepgramStream(): SttStream {
    const apiKey = env("DEEPGRAM_API_KEY");

    // Deepgram WS endpoint: tuned for telephony
    const url =
        "wss://api.deepgram.com/v1/listen" +
        "?encoding=mulaw" +
        "&sample_rate=8000" +
        "&channels=1" +
        "&punctuate=true" +
        "&interim_results=true" +
        "&endpointing=100" +
        "&vad_events=true" +
        "&keywords=Pulse:2";

    const ws = new WebSocket(url, {
        headers: { Authorization: `Token ${apiKey}` }
    });

    ws.on("error", (err) => {
        console.error("[Deepgram] WebSocket Error (Invalid Key?):", err.message);
    });

    const handlers: Array<(seg: SttSegment) => void> = [];
    const speechStartedHandlers: Array<() => void> = [];

    ws.on("message", (raw) => {
        try {
            const msg = JSON.parse(raw.toString());

            // Handle VAD "SpeechStarted"
            if (msg.type === "SpeechStarted") {
                speechStartedHandlers.forEach(h => h());
                return;
            }

            // Deepgram response shape varies; this handles the common transcript payload
            const alt = msg?.channel?.alternatives?.[0];
            const text: string | undefined = alt?.transcript;
            const confidence: number | undefined = alt?.confidence;

            // Interim vs final signals
            const isFinal = Boolean(msg?.is_final);

            if (text && text.trim().length > 0) {
                handlers.forEach((h) => h({ text: text.trim(), isFinal, confidence }));
            }
        } catch {
            // ignore parse errors
        }
    });

    function writeAudioMulaw8k(chunk: Buffer) {
        if (ws.readyState === WebSocket.OPEN) ws.send(chunk);
    }

    function onSegment(cb: (seg: SttSegment) => void) {
        handlers.push(cb);
    }

    function onSpeechStarted(cb: () => void) {
        speechStartedHandlers.push(cb);
    }

    function close() {
        try {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "CloseStream" }));
        } catch { }
        try {
            ws.close();
        } catch { }
    }

    return { writeAudioMulaw8k, onSegment, onSpeechStarted, close };
}
