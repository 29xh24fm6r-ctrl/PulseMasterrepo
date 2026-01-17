/**
 * Server Env Guard
 * Fail fast in production if required env vars are missing.
 */

const REQUIRED = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    // "SUPABASE_SERVICE_ROLE_KEY", // Validation handled lazily in admin.ts to support build-time static generation
    // add these only if those subsystems are enabled in prod:
    // "OPENAI_API_KEY",
    // "RESEND_API_KEY",
    // "CLERK_SECRET_KEY",
    // "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    // "STRIPE_SECRET_KEY",
];

// Helper to detect if we are running in a build context
export function isBuildPhase() {
    return (
        !!process.env.CI || // Skip in CI to allow smoke tests without secrets
        process.env.NEXT_PHASE === 'phase-production-build' ||
        process.env.npm_lifecycle_event === 'build' ||
        // Check for 'next build' in argv
        process.argv.some(arg => arg.endsWith('next') || arg.endsWith('next.js')) &&
        process.argv.includes('build')
    );
}

export function assertServerEnv() {
    // If not production, skip
    if (process.env.NODE_ENV !== "production") return;

    // If we are building, skip strict validation to prevent CI failures.
    // The runtime layout will re-check this when the server actually starts.
    if (isBuildPhase()) {
        const missing = REQUIRED.filter((k) => !process.env[k]);
        if (missing.length) {
            console.warn(`[Build] Missing env vars: ${missing.join(", ")}. Suppressing error for build safety.`);
        }
        return;
    }

    const missing = REQUIRED.filter((k) => !process.env[k] || !String(process.env[k]).trim());
    if (missing.length) {
        throw new Error(
            `Missing required env vars in production: ${missing.join(", ")}`
        );
    }
}
