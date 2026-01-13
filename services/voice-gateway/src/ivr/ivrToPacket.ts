import type { IVRPacket } from "../convo/types.js";

function toNumber(v: unknown, fallback: number): number {
    const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
    return Number.isFinite(n) ? n : fallback;
}

/**
 * Map your IVR webhook payload into the strict packet.
 * Replace the fields with your actual payload names.
 */
export function ivrToPacket(body: Record<string, unknown>): IVRPacket {
    const callId = String(body["CallSid"] ?? body["callId"] ?? "");
    if (!callId) throw new Error("ivrToPacket: missing callId/CallSid");

    // If no sequence, use timestamp millis (still monotonic enough for idempotency)
    const seq = toNumber(body["seq"], Date.now());

    // Human detection: you likely already have this logic in ivrParser.
    // Plug it in here. For now we accept a boolean hint.
    const isHuman = Boolean(body["isHuman"]);

    // Transcript if available (from STT). Otherwise empty.
    const transcript = String(body["transcript"] ?? "");

    return {
        callId,
        seq,
        isHuman,
        transcript,
        meta: { rawKeys: Object.keys(body).slice(0, 25) },
    };
}
