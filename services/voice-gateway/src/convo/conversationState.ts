import type { ChatMessage } from "./types.js";

type Session = {
    callId: string;
    updatedAtMs: number;
    messages: ChatMessage[];
};

export class ConversationStateStore {
    private readonly sessions = new Map<string, Session>();
    private readonly ttlMs: number;

    constructor(ttlSeconds: number) {
        this.ttlMs = Math.max(300, ttlSeconds) * 1000; // minimum 5 minutes
    }

    getOrCreate(callId: string): Session {
        this.gc();
        const existing = this.sessions.get(callId);
        if (existing) return existing;

        const s: Session = {
            callId,
            updatedAtMs: Date.now(),
            messages: [
                {
                    role: "system",
                    content:
                        "You are Pulse, a voice-first executive assistant. Speak in short, natural sentences. Prefer one clear next step. Ask at most one question at a time. Never mention internal systems. If you are unsure, ask a brief clarifying question.",
                },
            ],
        };
        this.sessions.set(callId, s);
        return s;
    }

    append(callId: string, msg: ChatMessage): void {
        const s = this.getOrCreate(callId);
        s.messages.push(msg);
        s.updatedAtMs = Date.now();
    }

    list(callId: string): ChatMessage[] {
        return this.getOrCreate(callId).messages;
    }

    private gc(): void {
        const now = Date.now();
        for (const [k, s] of this.sessions.entries()) {
            if (now - s.updatedAtMs > this.ttlMs) this.sessions.delete(k);
        }
    }
}
