export type XpKind =
    | "xp_physical"
    | "xp_discipline"
    | "xp_identity"
    | "xp_relationship"
    | "xp_career"
    | "xp_mind"
    | "xp_spirit";

export type Evidence = {
    id: string;
    user_id: string;
    life_event_id: string | null;
    evidence_type: string;
    evidence_payload: Record<string, any>;
    confidence: number;
    source: string;
    created_at: string;
};

export type EvalResult = {
    xp: Partial<Record<XpKind, number>>; // integer amounts
    meta?: Record<string, any>;          // confidence, rationale, etc.
};

export type Evaluator = {
    key: string;
    version: number;
    evaluate: (evidence: Evidence) => EvalResult;
};
