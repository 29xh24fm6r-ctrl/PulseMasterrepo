// lib/brain/schemas.ts
import { z } from 'zod';

// --- Observe ---
export const ObservePacketSchema = z.object({
    timestamp: z.string().datetime(),
    channel: z.enum(['voice', 'text', 'system', 'integration']),
    raw_text: z.string().optional(),
    entities: z.record(z.any()).optional(),
    current_context: z.object({
        location: z.string().optional(),
        activity: z.string().optional(),
        device: z.string().optional(),
    }).optional(),
    mode: z.enum(['calm', 'focused', 'stressed', 'urgent', 'reflective']),
});

// --- Recall ---
export const RecallPacketSchema = z.object({
    short_term_summary: z.string(),
    recent_events: z.array(z.string()),
    relevant_people: z.array(z.string()),
    open_loops: z.array(z.object({
        loop_id: z.string(),
        title: z.string(),
        status: z.string(),
    })),
    user_preferences: z.object({
        values: z.array(z.string()),
        anti_patterns: z.array(z.string()),
    }).optional(),
});

// --- Reason ---
export const CandidateIntentSchema = z.object({
    title: z.string(),
    why: z.string(),
    confidence: z.number().min(0).max(1),
    risk: z.enum(['low', 'medium', 'high']),
    needs_confirmation: z.boolean(),
    tool_name: z.string().optional(),
    tool_params: z.record(z.any()).optional(),
});

export const ReasoningResultSchema = z.object({
    reasoning_summary: z.string(),
    key_assumptions: z.array(z.string()),
    tradeoffs: z.array(z.string()),
    candidate_intents: z.array(CandidateIntentSchema),
    confidence_score: z.number().min(0).max(1),
    uncertainty_flags: z.array(z.string()),
});

// --- Simulate ---
export const SimulationScenarioSchema = z.object({
    intent_title: z.string(),
    predicted_outcome: z.string(),
    risk_adjustment: z.enum(['increase', 'decrease', 'neutral']),
    time_horizon: z.enum(['immediate', 'short_term', 'long_term']),
});

export const SimulationResultSchema = z.object({
    baseline_prediction: z.string(),
    scenarios: z.array(SimulationScenarioSchema),
    risk_assessment: z.string(),
    second_order_effects: z.array(z.string()),
    confidence_adjustment: z.number(),
});

// --- Decide ---
export const DecisionIntentSchema = z.object({
    selected_intent_title: z.string(),
    rationale: z.string(),
    requires_confirmation: z.boolean(),
    confirmation_style: z.enum(['light', 'explicit', 'none']),
    proposed_next_step: z.string(),
    confidence: z.number().min(0).max(1),
    risk_level: z.enum(['low', 'medium', 'high']),
    source_artifact_ids: z.array(z.string()),
    tool_call: z.object({
        name: z.string(),
        arguments: z.record(z.any()),
    }).optional(),
});
