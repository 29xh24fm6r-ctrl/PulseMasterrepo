export type DailyRhythmWindow = 'orientation' | 'recalibration' | 'reflection';

export const RHYTHM_WINDOWS = {
    ORIENTATION: {
        start: 5, // 5 AM
        end: 11,  // 11 AM
        key: 'orientation' as DailyRhythmWindow
    },
    RECALIBRATION: {
        start: 11, // 11 AM
        end: 17,   // 5 PM
        key: 'recalibration' as DailyRhythmWindow
    },
    REFLECTION: {
        start: 17, // 5 PM
        end: 23,   // 11 PM
        key: 'reflection' as DailyRhythmWindow
    }
};
