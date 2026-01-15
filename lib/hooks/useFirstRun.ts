import { useState, useEffect } from 'react';

const STORAGE_KEY = 'pulse.bridge.hasSeenFirstRun';

export function useFirstRun() {
    // Default to false initially to prevent hydration mismatch, 
    // then effect will check storage and set true if missing.
    // Actually, for a "newbie safe" experience, we want to default to SHOWING it
    // if we are unsure, but to avoid flash of content, let's start loaded.
    const [isFirstRun, setIsFirstRun] = useState<boolean>(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const seen = localStorage.getItem(STORAGE_KEY);
        // If key is missing, it IS a first run.
        if (!seen) {
            setIsFirstRun(true);
        } else {
            setIsFirstRun(false);
        }
        setIsLoaded(true);
    }, []);

    const markSeen = () => {
        localStorage.setItem(STORAGE_KEY, 'true');
        setIsFirstRun(false);
    };

    const resetFirstRun = () => {
        localStorage.removeItem(STORAGE_KEY);
        setIsFirstRun(true);
    };

    return { isFirstRun, isLoaded, markSeen, resetFirstRun };
}
