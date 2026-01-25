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

    // ✅ No publishable key at all - use MockClerkProvider
    // This prevents errors when Clerk hooks are called but no Clerk is configured
    if (!hasPublishableKey()) {
        console.warn("[ClerkProviderSafe] No publishable key - using MockClerkProvider");
        return (
            <MockClerkProvider>
                {showBanner && <PreviewAuthDisabledBanner />}
                {children}
            </MockClerkProvider>
        );
    }

    // ✅ ALWAYS use real ClerkProvider when we have a key (even if it's a dummy key)
    // Clerk will handle dummy keys gracefully during SSR/build
    // The key validation error only occurs when Clerk tries to connect, not during SSR
    //
    // Note: We previously tried to skip ClerkProvider with dummy keys, but that breaks
    // pages that use Clerk hooks during pre-rendering. Better to let Clerk handle it.
    return (
        <ClerkProvider>
            {showBanner && <PreviewAuthDisabledBanner />}
            {children}
        </ClerkProvider>
    );
}
