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

export function assertServerEnv(): void {
    // 🚫 Never assert required secrets during build-time module evaluation
    if (isBuildPhase()) return;

    const missing: string[] = [];

    // Public Supabase vars required at runtime server usage
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY"); // ✅ typo fixed

    // Add any other REQUIRED runtime vars here (server-only secrets, etc.)
    // Example:
    // if (!process.env.STRIPE_SECRET_KEY) missing.push("STRIPE_SECRET_KEY");

    if (missing.length > 0) {
        throw new Error(
            `Missing required env vars in production: ${missing.join(", ")}`
        );
    }
}
