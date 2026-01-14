export type ISODateString = string;

export type ProviderName = "openai" | "gemini" | "mock";

export type ConvoEventType =
    | "ivr.incoming"
    | "ivr.human_detected"
    | "convo.turn.started"
    | "convo.turn.completed"
    | "convo.turn.ignored_idempotent"
    | "convo.error";

export type Role = "system" | "user" | "assistant";

export interface ChatMessage {
    role: Role;
    content: string;
}

export interface IVRPacket {
    // Stable id for the call/conversation (Twilio CallSid or equivalent)
    callId: string;

    // A monotonic sequence (or timestamp) for idempotency per call
    // If you don't have a native seq, use e.g. webhook timestamp millis.
    seq: number;

    // Whether the packet looks like a human speaking (vs IVR, voicemail, dead air)
    isHuman: boolean;

    // If you have transcript from STT, place it here; otherwise empty string.
    transcript: string;

    // Optional raw metadata for observability
    meta?: Record<string, unknown>;
}

export interface TurnResult {
    assistantText: string;
    provider: ProviderName;
    model: string;
    usage?: {
        inputTokens?: number;
        outputTokens?: number;
    };
}

export interface EmitEvent {
    type: ConvoEventType;
    ts: ISODateString;
    callId: string;
    seq: number;
    idempotencyKey: string;
    payload: Record<string, unknown>;
}
