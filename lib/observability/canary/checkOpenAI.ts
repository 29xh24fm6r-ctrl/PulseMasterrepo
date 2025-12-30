import { CanaryCheckResult } from "./types";
import { withTimeout } from "./timeout";

export async function checkOpenAI(): Promise<CanaryCheckResult> {
    const started = Date.now();
    const timeoutMs = Number(process.env.CANARY_OPENAI_TIMEOUT_MS ?? "3500");

    try {
        await withTimeout("openai", timeoutMs, async () => {
            const key = process.env.OPENAI_API_KEY;
            if (!key) throw new Error("OPENAI_API_KEY missing");

            // Use your existing OpenAI wrapper if you have one.
            // Here’s a minimal fetch to avoid SDK drift:
            const res = await fetch("https://api.openai.com/v1/models", {
                headers: { Authorization: `Bearer ${key}` },
            });
            if (!res.ok) throw new Error(`OpenAI models call failed: ${res.status}`);
        });

        return { name: "openai", ok: true, ms: Date.now() - started };
    } catch (e) {
        return {
            name: "openai",
            ok: false,
            ms: Date.now() - started,
            detail: e instanceof Error ? e.message : "Unknown error",
        };
    }
}
