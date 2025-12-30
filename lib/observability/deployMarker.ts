import * as Sentry from "@sentry/nextjs";

let deployMarked = false;

export function markDeployOnce() {
    if (deployMarked) return;
    deployMarked = true;

    const release = process.env.NEXT_PUBLIC_PULSE_RELEASE;
    if (!release) return;

    try {
        Sentry.captureMessage("🚀 Pulse Deploy", {
            level: "info",
            tags: {
                deploy: "true",
                release,
                environment: process.env.NODE_ENV,
            },
        });
    } catch {
        // deploy markers must NEVER break runtime
    }
}
