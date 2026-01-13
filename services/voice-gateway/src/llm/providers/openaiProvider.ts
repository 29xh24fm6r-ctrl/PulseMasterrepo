import type { ChatMessage, TurnResult } from "../../convo/types.js";
import type { LLMProvider } from "./types.js";

type OpenAIChatResponse = {
    id: string;
    model: string;
    choices: Array<{ message: { role: string; content: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
};

export class OpenAIProvider implements LLMProvider {
    public readonly name = "openai" as const;
    public readonly defaultModel = "gpt-4.1-mini";

    private readonly apiKey: string;

    constructor(apiKey: string) {
        if (!apiKey) throw new Error("OPENAI_API_KEY is required for LLM_PROVIDER=openai");
        this.apiKey = apiKey;
    }

    async generate(opts: {
        model?: string;
        messages: ChatMessage[];
        temperature?: number;
        maxOutputTokens?: number;
        requestId: string;
    }): Promise<TurnResult> {
        const model = opts.model ?? this.defaultModel;

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
                "Idempotency-Key": opts.requestId,
            },
            body: JSON.stringify({
                model,
                messages: opts.messages,
                temperature: opts.temperature ?? 0.2,
                max_tokens: opts.maxOutputTokens ?? 250,
            }),
        });

        if (!res.ok) {
            const body = await res.text().catch(() => "");
            throw new Error(`OpenAI error: ${res.status} ${res.statusText} :: ${body}`);
        }

        const json = (await res.json()) as OpenAIChatResponse;

        const assistantText = json.choices?.[0]?.message?.content ?? "";
        return {
            assistantText,
            provider: "openai",
            model: json.model ?? model,
            usage: {
                inputTokens: json.usage?.prompt_tokens,
                outputTokens: json.usage?.completion_tokens,
            },
        };
    }
}
