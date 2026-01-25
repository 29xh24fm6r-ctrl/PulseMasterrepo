"use client";

import React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { isCanonicalHost } from "@/lib/auth/canonicalHosts";
import { PreviewAuthDisabledBanner } from "@/components/system/PreviewAuthDisabledBanner";

type Props = { children: React.ReactNode };

function hasPublishableKey(): boolean {
    return !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}

function isValidClerkKey(): boolean {
    const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (!key) return false;

    // ✅ Skip ClerkProvider for CI dummy keys
    // Clerk now validates keys during build and rejects dummy keys
    if (key.includes('dummy') || key.includes('ZHVtbXk')) {
        return false;
    }

    return true;
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

    // ✅ CRITICAL: Only skip ClerkProvider if there's NO publishable key OR it's a CI dummy key
    // Clerk now validates keys during build and rejects dummy/test keys
    // Clerk hooks NEED the provider context or they'll crash, but not during build with dummy keys
    if (!hasPublishableKey() || !isValidClerkKey()) {
        if (!hasPublishableKey()) {
            console.warn("[ClerkProviderSafe] No publishable key - rendering without ClerkProvider");
        } else {
            console.warn("[ClerkProviderSafe] CI/Test dummy key detected - rendering without ClerkProvider");
        }
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
