
export interface ContextSignals {
    timeOfDayBucket: 'morning' | 'workday' | 'evening' | 'night';
    isWorkday: boolean;
    locationType?: 'home' | 'work' | 'transit';
}

/**
 * Generates a stable hash of the current operating context.
 * Used to detect "Context Drift" - if an autonomy class was earned in
 * a different context, it should require re-confirmation.
 */
export function deriveContextHash(signals: ContextSignals): string {
    // Simple deterministic string for Phase 23
    return `${signals.timeOfDayBucket}|${signals.isWorkday ? 'wd' : 'wk'}|${signals.locationType || 'unk'}`;
}

export function getCurrentContext(): ContextSignals {
    const hour = new Date().getHours();
    let timeOfDayBucket: ContextSignals['timeOfDayBucket'] = 'night';
    if (hour >= 6 && hour < 9) timeOfDayBucket = 'morning';
    else if (hour >= 9 && hour < 18) timeOfDayBucket = 'workday';
    else if (hour >= 18 && hour < 22) timeOfDayBucket = 'evening';

    const day = new Date().getDay();
    const isWorkday = day !== 0 && day !== 6;

    return {
        timeOfDayBucket,
        isWorkday
    };
}
