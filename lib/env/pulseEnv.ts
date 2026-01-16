export type PulseEnv = "dev" | "preview" | "prod";

/**
 * Canonical environment classifier for Pulse.
 *
 * - "prod"    => real production
 * - "preview" => Vercel preview deployments (or equivalent)
 * - "dev"     => localhost and everything else
 *
 * NOTE:
 * - NODE_ENV is "production" for both preview and prod builds.
 * - VERCEL_ENV distinguishes preview vs production on Vercel.
 */
export function getPulseEnv(): PulseEnv {
    const vercelEnv = process.env.VERCEL_ENV;

    if (vercelEnv === "production") return "prod";
    if (vercelEnv === "preview") return "preview";
    return "dev";
}

export function isDevOrPreview(): boolean {
    const env = getPulseEnv();
    return env === "dev" || env === "preview";
}
