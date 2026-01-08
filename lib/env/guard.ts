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

export function assertServerEnv() {
    if (process.env.NODE_ENV !== "production") return;

    const missing = REQUIRED.filter((k) => !process.env[k] || !String(process.env[k]).trim());
    if (missing.length) {
        throw new Error(
            `Missing required env vars in production: ${missing.join(", ")}`
        );
    }
}
