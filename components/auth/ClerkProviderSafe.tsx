"use client";

import React from "react";

type Props = {
    children: React.ReactNode;
};

// IMPORTANT: do NOT import @clerk/nextjs at module scope if it can throw on missing keys.
// We dynamically import it only at runtime.
export function ClerkProviderSafe({ children }: Props) {
    // Build-time safety: Next may evaluate client components during prerender/export.
    // We explicitly check for build/export phases.
    const isBuild =
        process.env.NEXT_PHASE === "phase-production-build" ||
        process.env.NEXT_PHASE === "phase-export";

    if (isBuild) {
        // Render a static shell during build to bypass Auth hooks (useUser, etc.) in children.
        // This results in empty static pages, which is acceptable for Auth-gated apps.
        // Client-side hydration will take over at runtime.
        return (
            <html lang="en">
                <body></body>
            </html>
        );
    }

    // Runtime: require Clerk and keys.
    // Catch misconfigured deployments immediately.
    if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
        throw new Error("Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY at runtime");
    }

    return <ClerkProviderRuntime>{children}</ClerkProviderRuntime>;
}

function ClerkProviderRuntime({ children }: Props) {
    // Dynamic import to avoid module-scope evaluation issues
    const [Provider, setProvider] = React.useState<React.ComponentType<any> | null>(
        null
    );

    React.useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // @ts-ignore
                const mod = await import("@clerk/nextjs");
                if (!mounted) return;
                setProvider(() => mod.ClerkProvider);
            } catch (e) {
                console.error("Failed to load ClerkProvider", e);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    if (!Provider) return <>{children}</>;

    // At runtime, ClerkProvider will read NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    return <Provider>{children}</Provider>;
}
