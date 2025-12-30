import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,

    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_PULSE_RELEASE,

    // Noise-free baseline:
    tracesSampleRate: 0.05, // 5% perf traces
    debug: false,

    // Disable replays by default (high-volume/noisy)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
});
