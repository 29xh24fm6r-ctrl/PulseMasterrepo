import { RiskVector, OpportunityVector } from './vectors';

export type { RiskVector, OpportunityVector } from './vectors';

export type LifeState = {
    time_pressure: number;        // 0–1
    financial_pressure: number;   // 0–1
    energy_level: number;         // 0–1
    momentum_score: number;       // -1–1
    stress_index: number;         // 0–1
    risk_vectors: RiskVector[];
    opportunity_vectors: OpportunityVector[];
    confidence_level: number;     // 0–1
    updated_at: string;

    // Phase 13 Telemetry Extensions
    finance_telemetry?: {
        runway_days: number | null;
        spend_trend: number;
        anomalies: number;
    };
};

// Database row type (Supabase) - kept for compatibility if needed, but LifeState is the app-layer canon
export interface LifeStateRow {
    id: string;
    user_id: string;
    momentum_score: number;
    // ... maps to DB columns
}
