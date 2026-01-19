
import { AutonomyClass } from '../autonomy/types';
import { PulseEffect } from '../writeAuthority/types';
import { AutonomyExplanation } from './types';
import { decideAutonomyLevel } from '../autonomy/decideAutonomyLevel';

/**
 * Reconstructs the "Why" behind an autonomy decision.
 * This function accepts the raw ingredients (Effect + Class Snapshot) and produces a human-readable explanation.
 * 
 * In a real production environment, this would likely fetch the Class Snapshot *as it existed at that time* 
 * (Time-Travel Debugging), but for Phase 25 we assume the inputs are provided correctly.
 */
export function explainAutonomyDecision(
    effect: PulseEffect,
    autonomyClass: AutonomyClass
): AutonomyExplanation {
    // 1. Re-run the decision logic to get the reasoning trace
    // Note: This assumes the inputs (effect, class) are the snapshot of "then".
    const decision = decideAutonomyLevel(effect);

    const explanation: AutonomyExplanation = {
        summary: '',
        autonomyLevel: decision.autonomyLevel,
        routine: autonomyClass.classKey,
        eligibilityScore: autonomyClass.eligibilityScore,
        decayState: autonomyClass.decay_score ? `${(autonomyClass.decay_score * 100).toFixed(0)}% Decay` : 'No Decay',
        healthState: autonomyClass.health_state || 'healthy',
        contextFactors: [],
        safeguardsApplied: []
    };

    // 2. Build the Explanation Narrative
    if (decision.autonomyLevel === 'L1') {
        explanation.summary = "Pulse executed this autonomously because it met all trust & safety criteria.";
        explanation.contextFactors.push("High Reliability Score");
        explanation.contextFactors.push("Healthy State");
        explanation.contextFactors.push("Stable Context");
    } else {
        // It was L0 (Confirm-only)
        explanation.summary = "Pulse required confirmation for this action.";

        switch (decision.decisionReason) {
            case 'HEALTH_LOCKED':
                explanation.summary = "This routine is currently LOCKED due to safety concerns.";
                explanation.safeguardsApplied.push("Auto-Lock (Phase 24)");
                explanation.followUpActions = ["Review routine health", "Manual recovery required"];
                break;
            case 'HEALTH_DEGRADED':
                explanation.summary = "This routine has degraded due to inactivity or issues.";
                explanation.safeguardsApplied.push("Auto-Degradation (Phase 24)");
                explanation.followUpActions = ["Approve to restore health"];
                break;
            case 'CONTEXT_DRIFT':
                explanation.summary = "The context (Time/Location) is significantly different from usual.";
                explanation.safeguardsApplied.push("Context Drift Protection (Phase 23)");
                explanation.contextFactors.push(`Hash: ${autonomyClass.context_hash || 'Unknown'}`);
                break;
            case 'INSUFFICIENT_SCORE':
                explanation.summary = "Trust score is not yet high enough for full autonomy.";
                explanation.safeguardsApplied.push("Trust Gating (Phase 19)");
                break;
            case 'USER_PAUSED':
                explanation.summary = "Autonomy is globally paused by the user.";
                explanation.safeguardsApplied.push("User Override");
                break;
            default:
                explanation.summary = `Safety check: ${decision.decisionReason}`;
                explanation.safeguardsApplied.push("General Safety Gate");
        }
    }

    return explanation;
}
