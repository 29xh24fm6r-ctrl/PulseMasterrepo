export type AutonomyLevel = 'none' | 'l0' | 'l1';

export type AutonomyDecision =
    | { decision: 'ALLOW'; reason: string }
    | { decision: 'PROPOSE'; reason: string }
    | { decision: 'DENY'; reason: string };

export interface AutonomyScore {
    intent_type: string;
    confidence_score: number;
    approval_count: number;
    rejection_count: number;
    autonomy_level: AutonomyLevel;
}
