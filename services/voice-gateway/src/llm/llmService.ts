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

    constructor() {
        const name = getProviderName();
        if (name === "openai") {
            this.provider = new OpenAIProvider(mustGetEnv("OPENAI_API_KEY"));
        } else if (name === "gemini") {
            this.provider = new GeminiProvider(mustGetEnv("GEMINI_API_KEY"));
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
        return this.provider.generate({
            requestId: opts.requestId,
            model: opts.modelOverride,
            messages: opts.messages,
            temperature: 0.2,
            maxOutputTokens: 250,
        });
    }
}
