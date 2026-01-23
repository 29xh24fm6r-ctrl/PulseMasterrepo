// lib/runtime/runtimeHeaders.ts

export type PulseAuthHeader =
    | "required"
    | "missing"
    | "unknown"
    | "bypassed";

export function runtimeHeaders(opts?: { auth?: PulseAuthHeader }) {
    const env =
        process.env.VERCEL_ENV ??
        process.env.NODE_ENV ??
        "local";

    return {
        "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
        Pragma: "no-cache",
        "Surrogate-Control": "no-store",
        "x-pulse-env": env,
        "x-pulse-auth": opts?.auth ?? "unknown",
    };
}
