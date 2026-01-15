export type RiskVector = {
    domain: 'finance' | 'energy' | 'time' | 'health' | 'social';
    severity: number;        // 0–1
    horizon_days: number;
    explanation: string;
};

export type OpportunityVector = {
    domain: string;
    leverage: number;        // 0–1
    window_days: number;
    explanation: string;
};
