"use client";

import { useState, useEffect, useCallback } from "react";

export type PulsePresenceState = "idle" | "engaged" | "active";

export function usePulsePresenceState(
    lastContextUpdate: number,
    isGenerating: boolean
): {
    state: PulsePresenceState;
    recordInteraction: () => void;
} {
    const [lastInteraction, setLastInteraction] = useState<number>(Date.now());
    const [state, setState] = useState<PulsePresenceState>("idle");

    const recordInteraction = useCallback(() => {
        setLastInteraction(Date.now());
    }, []);

    useEffect(() => {
        const checkState = () => {
            const now = Date.now();
            const timeSinceInteraction = now - lastInteraction;
            const timeSinceContext = now - lastContextUpdate;

            // Active Logic: If Pulse is generating/working
            if (isGenerating) {
                setState("active");
                return;
            }

            // Engaged Logic: Recent interaction (< 10s)
            if (timeSinceInteraction < 10000) {
                setState("engaged");
                return;
            }

            // Idle Logic: Default
            setState("idle");
        };

        // Check immediately and then poll every second
        checkState();
        const interval = setInterval(checkState, 1000);
        return () => clearInterval(interval);
    }, [lastInteraction, lastContextUpdate, isGenerating]);

    return { state, recordInteraction };
}
