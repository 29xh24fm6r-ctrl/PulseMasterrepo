import type { ChatMessage, TurnResult } from "../../convo/types.js";
import type { LLMProvider } from "./types.js";

export class MockProvider implements LLMProvider {
    public readonly name = "mock" as const;
    public readonly defaultModel = "mock-1";

    async generate(opts: {
        model?: string;
        messages: ChatMessage[];
        temperature?: number;
        maxOutputTokens?: number;
        requestId: string;
    }): Promise<TurnResult> {
        const lastUser = [...opts.messages].reverse().find((m) => m.role === "user")?.content ?? "";
        return {
            assistantText: `Mock reply (requestId=${opts.requestId}): I heard "${lastUser}".`,
            provider: "mock",
            model: opts.model ?? this.defaultModel,
        };
    }
}
