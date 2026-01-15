export type IdentityCategory =
    | "value"
    | "avoidance"
    | "motivation"
    | "energy_pattern"
    | "stress_response"
    | "self_narrative";

export interface IdentitySignal {
    signal_id: string;
    category: IdentityCategory;
    description: string;          // neutral, observational
    confidence: number;           // 0.0–1.0
    evidence_refs: string[];      // intent_ids, thread_ids
    first_observed_at: string;    // ISO8601
    last_confirmed_at: string;    // ISO8601
}

export interface IdentityVector {
    vector_version: number;
    dominant_values: string[];
    recurring_conflicts: string[];
    stable_traits: string[];
    volatile_traits: string[];
    confidence: number;
    last_updated_at: string;      // ISO8601
}

export type TrajectoryHorizon = "7_days" | "30_days" | "90_days";
export type TrajectoryMomentum = "positive" | "neutral" | "negative";

export interface TrajectoryDelta {
    trajectory_id: string;
    description: string; // "Current patterns suggest..."
    horizon: TrajectoryHorizon;
    momentum: TrajectoryMomentum;
    confidence: number;
    based_on_signals: string[];
}

export type DataSufficiency = "low" | "medium" | "high";

export interface GeminiInsightEnvelope {
    identity_signals?: IdentitySignal[];
    trajectory_deltas?: TrajectoryDelta[];
    confidence_summary: {
        overall_confidence: number;
        data_sufficiency: DataSufficiency;
    };
    generated_at: string;         // ISO8601
}
