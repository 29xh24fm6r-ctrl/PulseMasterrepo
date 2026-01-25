"use client";

import React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { isCanonicalHost } from "@/lib/auth/canonicalHosts";
import { PreviewAuthDisabledBanner } from "@/components/system/PreviewAuthDisabledBanner";
import { MockClerkProvider } from "./MockClerkProvider";

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

    // ✅ No publishable key at all - skip both providers
    if (!hasPublishableKey()) {
        console.warn("[ClerkProviderSafe] No publishable key - rendering without ClerkProvider");
        return (
            <>
                {showBanner && <PreviewAuthDisabledBanner />}
                {children}
            </>
        );
    }

    // ✅ CI/Test dummy key detected - use MockClerkProvider
    // Clerk now validates keys during build and rejects dummy/test keys
    // MockClerkProvider provides stub hooks so pages can pre-render without errors
    if (!isValidClerkKey()) {
        console.warn("[ClerkProviderSafe] CI/Test dummy key detected - using MockClerkProvider");
        return (
            <MockClerkProvider>
                {showBanner && <PreviewAuthDisabledBanner />}
                {children}
            </MockClerkProvider>
        );
    }

    // ✅ Valid key - use real ClerkProvider
    // This satisfies scripts/verify-build-shell.ts requirement for 'phase-production-build'
    return (
        <ClerkProvider>
            {showBanner && <PreviewAuthDisabledBanner />}
            {children}
        </ClerkProvider>
    );
}
