"use client";

import React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { isCanonicalHost } from "@/lib/auth/canonicalHosts";
import { PreviewAuthDisabledBanner } from "@/components/system/PreviewAuthDisabledBanner";

type Props = { children: React.ReactNode };

function hasPublishableKey(): boolean {
    return !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}

export function ClerkProviderSafe({ children }: Props) {
    // ✅ FIX React #418: Hydration-safe banner detection
    // Must render same tree structure on server and client
    const [showBanner, setShowBanner] = React.useState(false);

    React.useEffect(() => {
        // Client-side only: Check if hostname is non-canonical
        const h = window.location.hostname;
        if (!isCanonicalHost(h)) {
            console.warn("[ClerkProviderSafe] Non-canonical host detected:", h);
            setShowBanner(true);
        }
    }, []);

    // Determine if Clerk should be skipped
    // This explicitly satisfies scripts/verify-build-shell.ts which demands 'phase-production-build' string presence.
    const skipClerk =
        process.env.NEXT_PHASE === "phase-production-build" ||
        process.env.NEXT_PHASE === "phase-export" ||
        process.env.CI === "true" ||
        process.env.NODE_ENV === "test" ||
        !hasPublishableKey();

    if (skipClerk) {
        // ✅ SAME tree structure as normal path (just without ClerkProvider wrapper)
        console.warn("[ClerkProviderSafe] Clerk disabled in build/CI/test mode");
        return (
            <>
                {showBanner && <PreviewAuthDisabledBanner />}
                {children}
            </>
        );
    }

    // ✅ Normal path - SAME structure (with ClerkProvider wrapper)
    return (
        <ClerkProvider>
            {showBanner && <PreviewAuthDisabledBanner />}
            {children}
        </ClerkProvider>
    );
}
