"use client";

import React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { isCanonicalHost, isVercelPreviewHost } from "@/lib/auth/canonicalHosts";
import { PreviewAuthDisabledBanner } from "@/components/system/PreviewAuthDisabledBanner";

type Props = { children: React.ReactNode };

function getHostnameSafe(): string {
    if (typeof window === "undefined") return "";
    return window.location.hostname || "";
}

function hasPublishableKey(): boolean {
    return !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}

export function ClerkProviderSafe({ children }: Props) {
    const hostname = getHostnameSafe();

    const canonical = isCanonicalHost(hostname);
    const enabled = canonical && hasPublishableKey();

    if (!enabled) {
        const showBanner = isVercelPreviewHost(hostname) || !canonical || !hasPublishableKey();
        return (
            <>
                {showBanner ? <PreviewAuthDisabledBanner /> : null}
                {children}
            </>
        );
    }

    return <ClerkProvider>{children}</ClerkProvider>;
}
