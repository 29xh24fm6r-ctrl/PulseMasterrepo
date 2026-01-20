"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type OverlayState = {
    ippActive: boolean;
    confirmationActive: boolean;
    explanationActive: boolean;

    // SystemBanner support (Task #11)
    bannerActive: boolean;
    bannerMessage?: string;
};

type OverlayApi = OverlayState & {
    setIPPActive: (v: boolean) => void;
    setConfirmationActive: (v: boolean) => void;
    setExplanationActive: (v: boolean) => void;

    showBanner: (message: string) => void;
    hideBanner: () => void;
};

const OverlayContext = createContext<OverlayApi | null>(null);

export function OverlayProvider({ children }: { children: React.ReactNode }) {
    const [ippActive, setIPPActive] = useState(false);
    const [confirmationActive, setConfirmationActive] = useState(false);
    const [explanationActive, setExplanationActive] = useState(false);

    const [bannerActive, setBannerActive] = useState(false);
    const [bannerMessage, setBannerMessage] = useState<string | undefined>(undefined);

    const api = useMemo<OverlayApi>(
        () => ({
            ippActive,
            confirmationActive,
            explanationActive,
            bannerActive,
            bannerMessage,

            setIPPActive,
            setConfirmationActive,
            setExplanationActive,

            showBanner: (message: string) => {
                setBannerMessage(message);
                setBannerActive(true);
            },
            hideBanner: () => {
                setBannerActive(false);
                setBannerMessage(undefined);
            },
        }),
        [
            ippActive,
            confirmationActive,
            explanationActive,
            bannerActive,
            bannerMessage,
        ]
    );

    return <OverlayContext.Provider value={api}>{children}</OverlayContext.Provider>;
}

/**
 * IMPORTANT: This hook MUST exist as a named export.
 * Many surfaces (Bridge/Plan/State/Observer) depend on it.
 */
export function useOverlays(): OverlayApi {
    const ctx = useContext(OverlayContext);
    if (!ctx) {
        throw new Error("useOverlays must be used within <OverlayProvider />");
    }
    return ctx;
}
