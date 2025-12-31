import * as Sentry from "@sentry/nextjs";

let bootMarked = false;

export function markBootOnce() {
    if (bootMarked) return;
    bootMarked = true;

    try {
        Sentry.captureMessage("🧊 Pulse Runtime Boot", {
            level: "info",
            tags: {
                boot: "true",
                release: process.env.NEXT_PUBLIC_PULSE_RELEASE ?? "unknown",
                environment: process.env.NODE_ENV ?? "unknown",
            },
        });
    } catch {
        // never block runtime
    }
}
