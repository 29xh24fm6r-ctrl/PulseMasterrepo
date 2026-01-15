
import { DecisionIntent } from '../brain/types';
import { supabaseAdmin } from '../supabase';
import { AutonomyDecision, AutonomyDomain } from './types';

/**
 * Autonomy Executor
 * =================
 * 
 * The Enforcer.
 * Executes the autonomy policy decided by the Governor.
 * 
 * Responsibilities:
 * 1. Log the event to `autonomy_events`.
 * 2. Enforce L0 (Block Execution).
 * 3. Enforce L1 (Require Confirmation).
 */

export class AutonomyExecutor {

    async executeAutonomously(
        userId: string,
        loopId: string,
        intent: DecisionIntent,
        decision: AutonomyDecision,
        domain: AutonomyDomain
    ): Promise<DecisionIntent> {

        const eventId = crypto.randomUUID();
        let finalIntent = { ...intent };
        let executed = false;

        // 1. Logic Enforcement
        if (!decision.allowed) {
            // Block everything
            finalIntent.tool_call = undefined; // Strip tool
            finalIntent.proposed_next_step = `Autonomy Denied: ${decision.reason}`;
            finalIntent.requires_confirmation = true; // Safety default
        } else {
            switch (decision.level) {
                case 'L0': // Observational
                    // DO NOT EXECUTE.
                    // Strip the tool call so the Orchestrator doesn't run it.
                    // But keep the 'intent' visible for the logs/UI.
                    if (finalIntent.tool_call) {
                        finalIntent.notes = `[L0 Observation] Would have executed: ${finalIntent.tool_call.name}`;
                        finalIntent.tool_call = undefined;
                        finalIntent.proposed_next_step = "Observed opportunity (L0)";
                    }
                    executed = false;
                    break;

                case 'L1': // Assisted
                    // MUST Confirm.
                    finalIntent.requires_confirmation = true;
                    finalIntent.confirmation_style = 'explicit';
                    finalIntent.proposed_next_step = `[L1 Suggestion] ${finalIntent.proposed_next_step}`;
                    executed = true; // "Executed" in the sense that we allow the Orchestrator to propose it
                    break;

                // L2+ Future impl
                default:
                    finalIntent.tool_call = undefined;
                    executed = false;
            }
        }

        // 2. Telemetry Logging (Async, don't block)
        await supabaseAdmin
            .from('autonomy_events')
            .insert({
                id: eventId,
                owner_user_id: userId,
                loop_id: loopId,
                decision_intent_id: undefined, // Linked later when intent persisted? Or we rely on loop_id
                domain,
                autonomy_level: decision.level,
                allowed: decision.allowed,
                executed: executed,
                confidence: intent.meta_confidence,
                notes: decision.reason
            });

        return finalIntent;
    }
}

export const autonomyExecutor = new AutonomyExecutor();
