import type { Resend } from "resend";

export async function getResend(): Promise<Resend> {
    const { getResendRuntime } = await import("@/lib/runtime/resend.runtime");
    return getResendRuntime();
}
