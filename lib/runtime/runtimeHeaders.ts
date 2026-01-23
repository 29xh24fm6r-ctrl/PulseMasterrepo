// lib/runtime/runtimeHeaders.ts
export type PulseAuthHeader =
    | "required"
    | "present"
    | "missing"
    | "bypassed"
    | "unknown";

export function runtimeHeaders(opts?: { auth?: PulseAuthHeader }) {
    const env =
        process.env.VERCEL_ENV ??
        process.env.NODE_ENV ??
        "local";

    const auth: PulseAuthHeader = opts?.auth ?? "unknown";

    // IMPORTANT: These strings must match CI expectations exactly.
    return {
        "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
        Pragma: "no-cache",
        "Surrogate-Control": "no-store",

        // Diagnostics required by the Phase 25K guardrails
        "x-pulse-env": String(env),
        "x-pulse-auth": auth,
    } as const;
}
