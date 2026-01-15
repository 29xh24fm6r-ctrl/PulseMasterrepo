export type DailyOrientationState = 'stable' | 'tightening' | 'heavy' | 'recovering' | 'volatile';

export type DailyOrientation = {
    date: string; // YYYY-MM-DD
    dominant_state: DailyOrientationState;
    primary_reason: string; // single sentence
    secondary_factors: string[]; // max 2
    confidence: number; // 0–1
    changed_since_yesterday: boolean;
};

export type OrientationFeedback = {
    day: string;
    feedback: 'accurate' | 'off';
};
