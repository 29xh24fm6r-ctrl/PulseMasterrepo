import { CanaryCheckResult } from "./types";
import { withTimeout } from "./timeout";

export async function checkEmail(): Promise<CanaryCheckResult> {
    const started = Date.now();
    const timeoutMs = Number(process.env.CANARY_EMAIL_TIMEOUT_MS ?? "2500");

    try {
        await withTimeout("email", timeoutMs, async () => {
            // Example: Resend
            const key = process.env.RESEND_API_KEY;
            if (!key) throw new Error("RESEND_API_KEY missing");

            // Dynamic import avoids bundling issues if not installed in some envs
            const { Resend } = await import("resend");
            const client = new Resend(key);

            // No-send check: just ensure client exists
            if (!client) throw new Error("Resend client init failed");
        });

        return { name: "email", ok: true, ms: Date.now() - started };
    } catch (e) {
        return {
            name: "email",
            ok: false,
            ms: Date.now() - started,
            detail: e instanceof Error ? e.message : "Unknown error",
        };
    }
}
