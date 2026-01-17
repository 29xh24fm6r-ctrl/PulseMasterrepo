import { CanaryCheckResult } from "./types";
import { withTimeout } from "./timeout";
import { getResend } from "@/services/email/resend";

export async function checkEmail(): Promise<CanaryCheckResult> {
    const started = Date.now();
    const timeoutMs = Number(process.env.CANARY_EMAIL_TIMEOUT_MS ?? "2500");

    try {
        const resend = getResend();
        await withTimeout("email", timeoutMs, async () => {
            // No-send check: just ensure client exists
            // This part might need to be updated to actually send an email
            // or to check the client's readiness more robustly.
            // For now, we'll assume the original intent of checking client existence.
            if (!resend) throw new Error("Resend client init failed");
            // If the intent was to actually send an email, it would look like this:
            // await resend.emails.send({
            //   from: 'onboarding@example.com',
            //   to: 'user@example.com',
            //   subject: 'Hello World',
            //   html: '<p>Congrats on sending your <strong>first email</strong>!</p>',
            // });
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
