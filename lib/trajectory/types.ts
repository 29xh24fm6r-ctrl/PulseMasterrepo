export type TrajectoryHorizonDays = 7 | 14 | 30;

export type TrajectoryLine = {
    horizon_days: TrajectoryHorizonDays;
    headline: string;      // single sentence, calm, confident
    confidence: number;    // 0–1
    drivers: string[];     // max 2
    updated_at: string;    // ISO
};
