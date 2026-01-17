import OpenAI from "openai";
import { assertRuntimeOnly } from "@/lib/env/runtime-phase";

let _client: OpenAI | null = null;

export function getOpenAIRuntime() {
    assertRuntimeOnly("OpenAI");
    if (_client) return _client;

    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("Missing env var: OPENAI_API_KEY");

    _client = new OpenAI({ apiKey: key });
    return _client;
}
