export type IntentStatus =
    | "active"
    | "paused"
    | "expired"
    | "resolved"
    | "abandoned";

export type IntentType =
    | "explicit_goal"   // "I need to buy milk"
    | "implicit_goal"   // "I'm so stressed" (Goal: calming)
    | "urgent_goal"     // "Stop everything"
    | "aspiration";     // "I want to be healthier"

export interface Intent {
    intent_id: string;
    source_utterance: string;
    inferred_goal: string;
    type: IntentType;
    confidence: number; // 0.0 – 1.0
    created_at: string; // ISO8601
    expires_at: string; // ISO8601
    status: IntentStatus;
    requires_confirmation: boolean;
    metadata?: Record<string, any>;
}

export interface ContinuityThread {
    thread_id: string;
    label?: string;
    active_intents: string[]; // List of intent_ids
    created_at: string;
    last_touched_at: string;
    is_active: boolean;
    metadata?: Record<string, any>;
}

export interface IntentExtractionResult {
    intents: Intent[];
}
