export function runtimeHeaders(opts?: {
    authed?: boolean;
}) {
    return {
        // Cache immunity (strict)
        "cache-control":
            "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
        pragma: "no-cache",
        expires: "0",

        // Pulse diagnostics
        "x-pulse-env": process.env.VERCEL_ENV ?? "unknown",
        "x-pulse-auth": opts?.authed ? "true" : "false",
    };
}
