import { useState, useEffect } from "react";

// Singleton Event Bus for signals that originate outside React tree (like global errors)
type SignalType = "error_denial" | "navigation";
const signalBus = new EventTarget();

export function dispatchOpeningSignal(type: SignalType) {
    signalBus.dispatchEvent(new CustomEvent("opening_signal", { detail: type }));
}

type OpeningState = {
    hasOpening: boolean;
    openingType: string | null;
    timestamp: number;
};

export function useOpeningSignals(
    isQuickTalkFocused: boolean,
    isHelpActive: boolean, // e.g. user clicked "Copy for help" recently
    isBuilderOpen: boolean // "Behind the scenes" is open
) {
    const [errorSignalTime, setErrorSignalTime] = useState<number>(0);

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail === "error_denial") {
                setErrorSignalTime(Date.now());
            }
        };
        signalBus.addEventListener("opening_signal", handler);
        return () => signalBus.removeEventListener("opening_signal", handler);
    }, []);

    const now = Date.now();
    const isErrorFresh = (now - errorSignalTime) < 15000; // 15s window

    let result: OpeningState = { hasOpening: false, openingType: null, timestamp: 0 };

    if (isQuickTalkFocused) {
        result = { hasOpening: true, openingType: "focus", timestamp: now };
    } else if (isHelpActive) {
        result = { hasOpening: true, openingType: "help", timestamp: now };
    } else if (isBuilderOpen) {
        result = { hasOpening: true, openingType: "builder", timestamp: now };
    } else if (isErrorFresh) {
        result = { hasOpening: true, openingType: "error", timestamp: errorSignalTime };
    }

    return result;
}
