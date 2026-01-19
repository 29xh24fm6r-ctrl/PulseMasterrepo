// lib/env/guard.ts

export function isBuildPhase(): boolean {
    // Next.js sets NEXT_PHASE during build
    if (process.env.NEXT_PHASE === "phase-production-build") return true;

    // CI environments
    if (process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true") {
        const argv = process.argv.join(" ");
        if (argv.includes("next") && argv.includes("build")) return true;
    }

    // Vercel build environments
    if (process.env.VERCEL === "1") {
        const argv = process.argv.join(" ");
        if (argv.includes("next") && argv.includes("build")) return true;
    }

    return false;
}

import { isCiSmoke } from "./isCiSmoke";

export function assertServerEnv(): void {
    // 🚫 Never assert required secrets during build-time module evaluation
    if (isBuildPhase()) return;

    const missing: string[] = [];

    // ✅ Enable CI Smoke Fallback for Public Keys
    const isSmoke = isCiSmoke();

    // Check SUPABASE_URL
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        if (isSmoke) {
            // Safe fallback for smoke tests (logic-only, no DB query)
            process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.ci.supabase.co";
        } else {
            missing.push("NEXT_PUBLIC_SUPABASE_URL");
        }
    }

    // Check SUPABASE_ANON_KEY
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        if (isSmoke) {
            // Safe fallback for smoke tests
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-ci-anon-key";
        } else {
            missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
        }
    }

    // Add other REQUIRED runtime vars here if they must fail-closed at runtime.
    // Example:
    // if (!process.env.STRIPE_SECRET_KEY) missing.push("STRIPE_SECRET_KEY");

    if (missing.length > 0) {
        throw new Error(`Missing required env vars in production: ${missing.join(", ")}`);
    }
}
