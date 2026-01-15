// lib/brain/types.ts

// --- 1. Observe (Input) ---
export interface ObservePacket {
    timestamp: string; // ISO8601
    channel: 'voice' | 'text' | 'system' | 'integration';
    raw_text?: string;
    entities?: Record<string, any>;
    current_context?: {
        location?: string;
        activity?: string;
        device?: string;
    };
    mode: 'calm' | 'focused' | 'stressed' | 'urgent' | 'reflective';
}

// --- 2. Recall (Context) ---
export interface RecallPacket {
    short_term_summary: string;
    recent_events: string[]; // Last 5-10 events
    relevant_people: string[]; // Names/IDs
    open_loops: {
        loop_id: string;
        title: string;
        status: string;
    }[];
    user_preferences?: {
        values: string[];
        anti_patterns: string[];
    };
    identity_trajectory: {
        direction: 'ascending' | 'descending' | 'flat';
        velocity: number;
        momentum: number;
        driver: string;
    };
    momentum_snapshot?: {
        total_score: number;
        active_domains: string[];
        dominant_trend: 'up' | 'down' | 'flat';
    };
    momentum_recent_events?: string[]; // Descriptions of recent signals
}

// --- 3. Reason (Gemini Output) ---
export interface CandidateIntent {
    title: string;
    why: string;
    confidence: number; // 0..1
    risk: 'low' | 'medium' | 'high';
    needs_confirmation: boolean;
    tool_name?: string; // Optional: hinted tool
    tool_params?: Record<string, any>; // Optional: hinted params
}

export interface ReasoningResult {
    reasoning_summary: string;
    key_assumptions: string[];
    tradeoffs: string[];
    candidate_intents: CandidateIntent[];
    confidence_score: number;
    uncertainty_flags: string[]; // e.g. "missing_context", "ambiguous_pronoun"
}

// --- 4. Simulate (Foresight) ---
export interface SimulationInput {
    observe: ObservePacket;
    recall: RecallPacket;
    reasoning: ReasoningResult;
    sim_version: string;
}

export interface SimulationScenario {
    intent_title: string;
    summary: string;
    predicted_outcomes: string[];
    momentum_delta: {
        vector: number; // +/- change in score
        direction: 'aligned' | 'opposed' | 'neutral';
    };
    identity_alignment: 'align' | 'neutral' | 'conflict';
    risk_score: number; // 0..1
    risk_factors: string[];
    second_order_effects: string[];
    unknowns: string[];
    confidence: number;
}

export interface SimulationBaseline {
    summary: string;
    predicted_outcomes: string[];
    risks: string[];
    momentum_projection: {
        trend: 'up' | 'down' | 'flat';
        description: string;
    };
    confidence: number;
}

export interface SimulationResult {
    baseline: SimulationBaseline;
    scenarios: SimulationScenario[];
    recommended_intent_title: string | null;
    confidence_adjustment: number; // e.g., -0.1 if risky
    uncertainty_flags: string[];
}

// --- 5. Meta-Cognition (Trust Layer) ---
export interface MetaCognitionResult {
    final_confidence: number;
    escalation_level: 'none' | 'clarify' | 'confirm' | 'defer';
    reasons: string[];
    reflection_required: boolean;
    trust_posture: 'confident' | 'cautious' | 'uncertain';
}

export interface ReflectionArtifact {
    loop_id: string;
    what_was_assumed: string[];
    what_changed_after_simulation: string[];
    why_confidence_changed: string;
    what_to_watch_next_time: string[];
    learning_tags: string[];
}

// --- 6. Decide (Orchestrator Output) ---
export interface DecisionIntent {
    selected_intent_title: string;
    rationale: string;
    requires_confirmation: boolean;
    confirmation_style: 'light' | 'explicit' | 'none';
    proposed_next_step: string; // Description, NOT executable code
    confidence: number; // Raw confidence
    risk_level: 'low' | 'medium' | 'high';
    source_artifact_ids: string[]; // Link back to reasoning/simulation
    tool_call?: { // Optional: The actual tool to call if confirmed
        name: string;
        arguments: Record<string, any>;
    };

    // Phase 10 Extensions
    meta_confidence?: number; // Configured confidence
    escalation_level?: 'none' | 'clarify' | 'confirm' | 'defer';
    trust_posture?: 'confident' | 'cautious' | 'uncertain';
    reflection_artifact_id?: string;

    // Phase 10.5 Canon Extensions (Hard Invariants)
    meta_verified?: boolean; // Must be true to execute
    canon_version?: string; // e.g. "brain-v1.0"
    trust_hash?: string; // SHA-256 of reasoning+sim+meta
}

// --- Loop Result ---
export interface BrainLoopResult {
    loop_id: string;
    decision: DecisionIntent;
    artifacts: {
        reasoning_id: string;
        simulation_id: string;
    };
}
