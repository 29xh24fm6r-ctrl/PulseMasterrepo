import { createClient } from "@/lib/supabase/server";
import { DecisionTrace, validateExplanationStructure } from "./DecisionTrace";

export class TraceStore {
    /**
     * Persist a decision trace to the canonical store.
     * Guaranteed to never block execution flow (fire and forget pattern safe).
     */
    static async persist(trace: DecisionTrace): Promise<void> {
        try {
            // 1. Validation
            validateExplanationStructure(trace.explanation_summary);

            // 2. Persist
            // We use the server client. In a real edge case, we might need a non-auth client 
            // but these traces are strictly user-scoped so auth context is required.
            const supabase = createClient();

            const { error } = await supabase.from("decision_traces").insert({
                id: trace.trace_id,
                user_id: trace.user_id,
                created_at: trace.created_at,
                detected_intent: trace.detected_intent,
                confidence_score: trace.confidence_score,
                trust_level: trace.trust_level,
                user_mode: trace.user_mode,
                gates: trace.gates, // JSONB
                outcome: trace.outcome,
                explanation_summary: trace.explanation_summary
            });

            if (error) {
                console.error("[TRACE LOSS] Failed to persist decision trace:", error);
                // We do NOT throw here to prevent bringing down the app, 
                // but this is a critical observability failure.
            } else {
                console.log(`[TRACE SAVED] ${trace.trace_id} (${trace.outcome})`);
            }

        } catch (err) {
            console.error("[TRACE ERROR] Trace persistence crashed:", err);
        }
    }
}
