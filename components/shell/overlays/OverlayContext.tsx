"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type OverlayType = "IPP" | "CONFIRMATION" | "BANNER" | "EXPLANATION" | null;

interface OverlayState {
    ippActive: boolean;
    confirmationActive: boolean;
    bannerActive: boolean;
    bannerMessage: string | null;
    explanationActive: boolean;
}

interface OverlayContextType {
    state: OverlayState;
    setIPPActive: (active: boolean) => void;
    setConfirmationActive: (active: boolean) => void;
    setBannerActive: (active: boolean, message?: string) => void;
    setExplanationActive: (active: boolean) => void;
    // Helpers to test/stub
    triggerExampleIPP: () => void;
}

const OverlayContext = createContext<OverlayContextType | undefined>(undefined);

export function OverlayProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<OverlayState>({
        ippActive: false,
        confirmationActive: false,
        bannerActive: false,
        bannerMessage: null,
        explanationActive: false,
    });

    const setIPPActive = (active: boolean) => setState((prev) => ({ ...prev, ippActive: active }));
    const setConfirmationActive = (active: boolean) => setState((prev) => ({ ...prev, confirmationActive: active }));
    const setBannerActive = (active: boolean, message?: string) => setState((prev) => ({
        ...prev,
        bannerActive: active,
        bannerMessage: active ? (message || prev.bannerMessage) : null
    }));
    const setExplanationActive = (active: boolean) => setState((prev) => ({ ...prev, explanationActive: active }));

    const triggerExampleIPP = () => {
        setIPPActive(true);
        setTimeout(() => setIPPActive(false), 3000); // Auto-dismiss for test
    };

    return (
        <OverlayContext.Provider
            value={{
                state,
                setIPPActive,
                setConfirmationActive,
                setBannerActive,
                setExplanationActive,
                triggerExampleIPP,
            }}
        >
            {children}
        </OverlayContext.Provider>
    );
}

export function useOverlays() {
    const context = useContext(OverlayContext);
    if (!context) {
        throw new Error("useOverlays must be used within an OverlayProvider");
    }
    return context;
}
