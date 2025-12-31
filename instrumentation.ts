import * as Sentry from "@sentry/nextjs";
import { markBootOnce } from "@/lib/observability/coldStart";
import { markDeployOnce } from "@/lib/observability/deployMarker";

export async function register() {
    markBootOnce();
    markDeployOnce();

    // Next calls register() in both node + edge;
    // import runtime-specific config inside the function.
    if (process.env.NEXT_RUNTIME === "nodejs") {
        await import("./sentry.server.config");
    }

    if (process.env.NEXT_RUNTIME === "edge") {
        await import("./sentry.edge.config");
    }
}

// Let Next route + RSC request errors flow to Sentry automatically
export const onRequestError = Sentry.captureRequestError;
