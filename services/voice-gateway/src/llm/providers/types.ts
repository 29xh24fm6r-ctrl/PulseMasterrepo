import type { ChatMessage, ProviderName, TurnResult } from "../../convo/types.js";

export interface LLMProvider {
    readonly name: ProviderName;
    readonly defaultModel: string;

    generate(opts: {
        model?: string;
        messages: ChatMessage[];
        temperature?: number;
        maxOutputTokens?: number;
        requestId: string; // for idempotency/trace
    }): Promise<TurnResult>;
}
