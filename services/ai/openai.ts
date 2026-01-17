import OpenAI from "openai";

let _openai: OpenAI | null = null;

export function getOpenAI(): OpenAI {
    if (_openai) return _openai;

    const key = process.env.OPENAI_API_KEY;

    // IMPORTANT: allow missing keys during CI/build import evaluation
    if (process.env.CI || process.env.NEXT_PHASE === "phase-production-build") {
        // Return a thrower to ensure runtime calls fail loudly if invoked without secrets
        return new Proxy({} as OpenAI, {
            get() {
                throw new Error("OPENAI_API_KEY is required at runtime to use OpenAI.");
            },
        });
    }

    if (!key) {
        throw new Error("Missing OPENAI_API_KEY environment variable");
    }

    _openai = new OpenAI({ apiKey: key });
    return _openai;
}
