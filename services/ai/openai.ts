import type OpenAI from "openai";

export async function getOpenAI(): Promise<OpenAI> {
    const { getOpenAIRuntime } = await import("@/lib/runtime/openai.runtime");
    return getOpenAIRuntime();
}
