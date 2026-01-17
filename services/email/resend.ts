import { Resend } from "resend";

let _resend: Resend | null = null;

export function getResend(): Resend {
    if (_resend) return _resend;

    const key = process.env.RESEND_API_KEY;

    if (process.env.CI || process.env.NEXT_PHASE === "phase-production-build") {
        return new Proxy({} as Resend, {
            get() {
                throw new Error("RESEND_API_KEY is required at runtime to send email.");
            },
        });
    }

    if (!key) throw new Error("Missing RESEND_API_KEY environment variable");

    _resend = new Resend(key);
    return _resend;
}
