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

    // ✅ CRITICAL: Only skip ClerkProvider if there's NO publishable key
    // Clerk is designed to work during build/CI - it just returns loading state
    // Clerk hooks NEED the provider context or they'll crash
    if (!hasPublishableKey()) {
        console.warn("[ClerkProviderSafe] No publishable key - rendering without ClerkProvider");
        return (
            <>
                {showBanner && <PreviewAuthDisabledBanner />}
                {children}
            </>
        );
    }

    // ✅ ALWAYS render ClerkProvider when we have a key
    // Even during build/CI - Clerk handles these cases gracefully
    // This satisfies scripts/verify-build-shell.ts requirement for 'phase-production-build'
    return (
        <ClerkProvider>
            {showBanner && <PreviewAuthDisabledBanner />}
            {children}
        </ClerkProvider>
    );
}
