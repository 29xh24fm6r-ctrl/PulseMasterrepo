import type { ChatMessage, ProviderName, TurnResult } from "../convo/types.js";
import { OpenAIProvider } from "./providers/openaiProvider.js";
import { GeminiProvider } from "./providers/geminiProvider.js";
import { MockProvider } from "./providers/mockProvider.js";
import type { LLMProvider } from "./providers/types.js";

function mustGetEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing required env var: ${name}`);
    return v;
}

function getProviderName(): ProviderName {
    const raw = (process.env.LLM_PROVIDER ?? "mock").toLowerCase();
    if (raw === "openai" || raw === "gemini" || raw === "mock") return raw;
    return "mock";
}

export class LLMService {
    private readonly provider: LLMProvider;
    private readonly fallbackProvider?: LLMProvider;

    constructor() {
        const name = getProviderName();
        if (name === "openai") {
            this.provider = new OpenAIProvider(mustGetEnv("OPENAI_API_KEY"));
        } else if (name === "gemini") {
            this.provider = new GeminiProvider(mustGetEnv("GEMINI_API_KEY"));
            // Fallback to OpenAI for reliability
            if (process.env.OPENAI_API_KEY) {
                this.fallbackProvider = new OpenAIProvider(process.env.OPENAI_API_KEY);
            }
        } else {
            this.provider = new MockProvider();
        }
    }

    getProvider(): ProviderName {
        return this.provider.name;
    }

    async reply(opts: {
        requestId: string;
        messages: ChatMessage[];
        modelOverride?: string;
    }): Promise<TurnResult> {
        const payload = {
            requestId: opts.requestId,
            model: opts.modelOverride,
            messages: opts.messages,
            temperature: 0.2,
            maxOutputTokens: 250,
        };

        const timeoutMs = 5000;

        try {
            // Attempt Primary with Timeout
            const primaryPromise = this.provider.generate(payload);
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("LLM Timeout")), timeoutMs)
            );
            return await Promise.race([primaryPromise, timeoutPromise]);

        } catch (err: any) {
            console.error(`[LLMService] Primary Provider Error (${this.provider.name}):`, err.message);

            if (this.fallbackProvider) {
                console.log(`[LLMService] Attempting Fallback to ${this.fallbackProvider.name}...`);
                try {
                    return await this.fallbackProvider.generate(payload);
                } catch (fallbackErr: any) {
                    console.error(`[LLMService] Fallback Provider Error:`, fallbackErr.message);
                    throw fallbackErr; // Both failed
                }
            }
            throw err;
        }
    }
}
