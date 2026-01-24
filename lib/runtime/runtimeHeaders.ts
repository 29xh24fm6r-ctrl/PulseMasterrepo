// lib/runtime/runtimeHeaders.ts

export type PulseAuthHeader =
    | "required"
    | "missing"
    | "unknown"
    | "bypassed"
    | "true"
    | "false";

export function runtimeHeaders(opts?: { auth?: PulseAuthHeader; authed?: boolean }) {
    const env =
        process.env.VERCEL_ENV ??
        process.env.NODE_ENV ??
        "local";

    let authValue = opts?.auth ?? "unknown";
    if (opts?.authed !== undefined) {
        authValue = opts.authed ? "true" : "false";
    }

    return {
        "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
        Pragma: "no-cache",
        "Surrogate-Control": "no-store",
        "x-pulse-env": env,
        "x-pulse-auth": authValue,
    };
}
