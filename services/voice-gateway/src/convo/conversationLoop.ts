import type { IVRPacket, EmitEvent, TurnResult } from "./types.js";
import { LLMService } from "../llm/llmService.js";
import { IdempotencyStore } from "./idempotencyStore.js";
import { ConversationStateStore } from "./conversationState.js";
import { getEventSink } from "../events/getEventSink.js";

function nowIso(): string {
    return new Date().toISOString();
}

function makeIdempotencyKey(callId: string, seq: number): string {
    return `call:${callId}:seq:${seq}`;
}

export class ConversationLoop {
    private readonly llm = new LLMService();
    private readonly idempotency: IdempotencyStore;
    private readonly state: ConversationStateStore;
    private readonly sink = getEventSink();

    constructor() {
        const ttl = Number(process.env.CONVO_TTL_SECONDS ?? "3600");
        this.idempotency = new IdempotencyStore(ttl);
        this.state = new ConversationStateStore(ttl);
    }

    /**
     * Main entrypoint: feed an IVR packet.
     * Returns assistantText when we should speak, or null when we should do nothing.
     */
    async handle(packet: IVRPacket): Promise<string | null> {
        const idempotencyKey = makeIdempotencyKey(packet.callId, packet.seq);

        // Emit inbound (best-effort)
        await this.emit({
            type: "ivr.incoming",
            ts: nowIso(),
            callId: packet.callId,
            seq: packet.seq,
            idempotencyKey,
            payload: { isHuman: packet.isHuman, hasTranscript: packet.transcript.length > 0, meta: packet.meta ?? {} },
        });

        // Hard gate: only enter convo mode when human detected
        if (!packet.isHuman) return null;

        await this.emit({
            type: "ivr.human_detected",
            ts: nowIso(),
            callId: packet.callId,
            seq: packet.seq,
            idempotencyKey,
            payload: {},
        });

        // Idempotency: do not process same turn twice
        if (this.idempotency.has(idempotencyKey)) {
            await this.emit({
                type: "convo.turn.ignored_idempotent",
                ts: nowIso(),
                callId: packet.callId,
                seq: packet.seq,
                idempotencyKey,
                payload: {},
            });
            return null;
        }
        this.idempotency.put(idempotencyKey);

        await this.emit({
            type: "convo.turn.started",
            ts: nowIso(),
            callId: packet.callId,
            seq: packet.seq,
            idempotencyKey,
            payload: { provider: this.llm.getProvider() },
        });

        try {
            // LISTEN: transcript becomes user message
            const userText = (packet.transcript ?? "").trim();
            if (userText.length === 0) {
                // If human detected but no text, ask a short prompt
                const prompt = "I’m here. What do you want to do?";
                this.state.append(packet.callId, { role: "assistant", content: prompt });

                await this.emit({
                    type: "convo.turn.completed",
                    ts: nowIso(),
                    callId: packet.callId,
                    seq: packet.seq,
                    idempotencyKey,
                    payload: { assistantChars: prompt.length, emptyTranscript: true },
                });

                return prompt;
            }

            this.state.append(packet.callId, { role: "user", content: userText });

            // THINK: LLM
            const result: TurnResult = await this.llm.reply({
                requestId: idempotencyKey,
                messages: this.state.list(packet.callId),
            });

            // SPEAK: return assistant text to your IVR layer to render TTS / TwiML
            const assistantText = (result.assistantText ?? "").trim() || "Okay.";
            this.state.append(packet.callId, { role: "assistant", content: assistantText });

            await this.emit({
                type: "convo.turn.completed",
                ts: nowIso(),
                callId: packet.callId,
                seq: packet.seq,
                idempotencyKey,
                payload: {
                    provider: result.provider,
                    model: result.model,
                    usage: result.usage ?? {},
                    assistantChars: assistantText.length,
                },
            });

            return assistantText;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);

            await this.emit({
                type: "convo.error",
                ts: nowIso(),
                callId: packet.callId,
                seq: packet.seq,
                idempotencyKey,
                payload: { message },
            });

            // Fail closed: short apology, keep it moving
            const fallback = "Sorry — I missed that. Can you say it again?";
            this.state.append(packet.callId, { role: "assistant", content: fallback });
            return fallback;
        }
    }

    private async emit(evt: EmitEvent): Promise<void> {
        await this.sink.emit(evt);
    }
}
