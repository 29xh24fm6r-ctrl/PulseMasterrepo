import { DailyRhythmWindow, RHYTHM_WINDOWS } from './DailyRhythm';

type RhythmEligibilityResult = {
    eligible: boolean;
    reason?: string;
    window?: DailyRhythmWindow;
};

export function isRhythmEligible(
    now: Date,
    lastInteractionTime?: Date
): RhythmEligibilityResult {
    const currentHour = now.getHours();

    // 1. Identify current window
    let currentWindow: DailyRhythmWindow | undefined;

    if (currentHour >= RHYTHM_WINDOWS.ORIENTATION.start && currentHour < RHYTHM_WINDOWS.ORIENTATION.end) {
        currentWindow = 'orientation';
    } else if (currentHour >= RHYTHM_WINDOWS.RECALIBRATION.start && currentHour < RHYTHM_WINDOWS.RECALIBRATION.end) {
        currentWindow = 'recalibration';
    } else if (currentHour >= RHYTHM_WINDOWS.REFLECTION.start && currentHour < RHYTHM_WINDOWS.REFLECTION.end) {
        currentWindow = 'reflection';
    }

    // 2. If no window, not eligible independent of anything else
    if (!currentWindow) {
        return {
            eligible: false,
            reason: "Outside of daily rhythm windows."
        };
    }

    // 3. Check for previous interaction in this window (Throttling)
    if (lastInteractionTime) {
        const isSameDay = lastInteractionTime.getDate() === now.getDate() &&
            lastInteractionTime.getMonth() === now.getMonth() &&
            lastInteractionTime.getFullYear() === now.getFullYear();

        if (isSameDay) {
            const lastHour = lastInteractionTime.getHours();
            // Check if the last interaction fell within the CURRENT window definition
            const windowDef = Object.values(RHYTHM_WINDOWS).find(w => w.key === currentWindow);

            if (windowDef && lastHour >= windowDef.start && lastHour < windowDef.end) {
                return {
                    eligible: false,
                    reason: `Already interacted during ${currentWindow} window.`,
                    window: currentWindow
                };
            }
        }
    }

    return {
        eligible: true,
        window: currentWindow
    };
}
