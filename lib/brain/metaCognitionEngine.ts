import { ReasoningResult, SimulationResult, MetaCognitionResult } from './types';

/**
 * Pulse Meta-Cognition Engine (Phase 10)
 * ======================================
 * 
 * Responsibility:
 * - Evaluate confidence stability (Reasoning vs Simulation).
 * - Detect drift and uncertainty.
 * - Enforce Trust Preservation by escalating risky decisions.
 */

export class MetaCognitionEngine {

    /**
     * Evaluates the confidence of a decision loop based on inputs.
     * Implements strict Escalation Matrix rules.
     */
    evaluateConfidence(
        reasoning: ReasoningResult,
        simulation: SimulationResult
    ): MetaCognitionResult {
        const rawConfidence = reasoning.confidence_score;
        const simAdjustment = simulation.confidence_adjustment;
        const finalConfidence = Math.max(0, Math.min(1, rawConfidence + simAdjustment));

        const reasons: string[] = [];
        let escalation: 'none' | 'clarify' | 'confirm' | 'defer' = 'none';

        // RULE 1: Simulation Delta Rule (Significant Drop)
        if (simAdjustment < -0.20) {
            escalation = 'clarify';
            reasons.push(`Significant simulation confidence drop (${simAdjustment})`);
        }

        // RULE 2: Unknowns Rule
        // Aggregate unknowns from all scenarios
        const totalUnknowns = simulation.scenarios.reduce((sum, s) => sum + s.unknowns.length, 0);
        if (totalUnknowns >= 2) {
            escalation = this.upgradeEscalation(escalation, 'clarify');
            reasons.push(`Too many unknowns (${totalUnknowns}) detected`);
        }

        // RULE 3: Identity Conflict Rule
        const hasIdentityConflict = simulation.scenarios.some(s => s.identity_alignment === 'conflict');
        if (hasIdentityConflict) {
            escalation = this.upgradeEscalation(escalation, 'confirm');
            reasons.push("Identity Conflict detected in scenario outcomes");
        }

        // RULE 4: Low Absolute Confidence Rule
        if (finalConfidence < 0.45) {
            escalation = 'clarify'; // Can't be 'none' if confidence is this low
            reasons.push(`Low absolute confidence (${finalConfidence.toFixed(2)})`);
        }

        // RULE 5: Drift Rule (Placeholder - requires history, future impl)
        // If (history variance > threshold) -> defer

        // Derive Trust Posture
        let posture: 'confident' | 'cautious' | 'uncertain' = 'confident';
        if (escalation === 'defer' || finalConfidence < 0.5) posture = 'uncertain';
        else if (escalation !== 'none' || finalConfidence < 0.75) posture = 'cautious';

        return {
            final_confidence: finalConfidence,
            escalation_level: escalation,
            reasons,
            reflection_required: escalation === 'defer' || simAdjustment <= -0.25,
            trust_posture: posture
        };
    }

    /**
     * Helper to ensure we only escalate UP, never down.
     */
    private upgradeEscalation(
        current: 'none' | 'clarify' | 'confirm' | 'defer',
        proposed: 'none' | 'clarify' | 'confirm' | 'defer'
    ): 'none' | 'clarify' | 'confirm' | 'defer' {
        const levels = { 'none': 0, 'clarify': 1, 'confirm': 2, 'defer': 3 };
        return levels[proposed] > levels[current] ? proposed : current;
    }
}

export const metaCognitionEngine = new MetaCognitionEngine();
