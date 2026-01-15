import type { ChatMessage, TurnResult } from "../../convo/types.js";
import type { LLMProvider } from "./types.js";

type GeminiResponse = {
    modelVersion?: string;
    candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
    }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
};

// NOTE: This uses the public Gemini REST API shape.
// If your project already has an official SDK wrapper, swap this file only.
export class GeminiProvider implements LLMProvider {
    public readonly name = "gemini" as const;
    public readonly defaultModel = "gemini-2.0-flash-exp";

    private readonly apiKey: string;

    constructor(apiKey: string) {
        if (!apiKey) throw new Error("GEMINI_API_KEY is required for LLM_PROVIDER=gemini");
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

        // Convert chat messages to a single prompt (keeps this gateway-only + simple).
        // If you prefer full role-structured Gemini content, expand this mapping later.
        const prompt = opts.messages
            .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
            .join("\n");

        const url =
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent` +
            `?key=${encodeURIComponent(this.apiKey)}`;

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Gemini doesn’t officially support an idempotency header in the same way,
                // but we still include it for trace correlation downstream.
                "X-Request-Id": opts.requestId,
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: opts.temperature ?? 0.2,
                    maxOutputTokens: opts.maxOutputTokens ?? 250,
                },
            }),
        });

        if (!res.ok) {
            const body = await res.text().catch(() => "");
            throw new Error(`Gemini error: ${res.status} ${res.statusText} :: ${body}`);
        }

        const json = (await res.json()) as GeminiResponse;

        const assistantText =
            json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";

        return {
            assistantText,
            provider: "gemini",
            model: json.modelVersion ?? model,
            usage: {
                inputTokens: json.usageMetadata?.promptTokenCount,
                outputTokens: json.usageMetadata?.candidatesTokenCount,
            },
        };
    }
}
