import { ReasoningResult, SimulationResult, MetaCognitionResult, ReflectionArtifact } from './types';
import { supabaseAdmin } from '../supabase';

/**
 * Pulse Reflection Engine (Phase 10)
 * ==================================
 * 
 * Responsibility:
 * - Capture learning moments when Simulation disagrees with Reasoning.
 * - Drastically dropped confidence -> Reflection Artifact.
 * - This feeds specific feedback loops for future reasoning (via M5/Recall).
 */

export class ReflectionEngine {

    /**
     * Generates and persists a Reflection Artifact if required.
     */
    async processReflection(
        ownerUserId: string,
        loopId: string,
        metaResult: MetaCognitionResult,
        reasoning: ReasoningResult,
        simulation: SimulationResult
    ): Promise<string | null> {

        if (!metaResult.reflection_required) {
            return null;
        }

        console.log(`[ReflectionEngine] 🧠 Generating Reflection for Loop ${loopId}...`);

        // Heuristic Learning Logic (Mocked for now, but structured)
        const learningTags = ['uncertainty_detected'];
        if (metaResult.escalation_level === 'defer') learningTags.push('deferral_event');
        if (simulation.confidence_adjustment < -0.2) learningTags.push('simulation_divergence');

        const reflectionContent: ReflectionArtifact = {
            loop_id: loopId,
            what_was_assumed: reasoning.key_assumptions,
            what_changed_after_simulation: simulation.baseline.predicted_outcomes.slice(0, 3), // Just a sample
            why_confidence_changed: metaResult.reasons.join('; '),
            what_to_watch_next_time: simulation.uncertainty_flags,
            learning_tags: learningTags
        };

        // Persist to DB (reuse brain_thought_artifacts)
        try {
            const { data, error } = await supabaseAdmin
                .from('brain_thought_artifacts')
                .insert({
                    owner_user_id: ownerUserId,
                    loop_id: loopId,
                    kind: 'reflection',
                    input_packet: { reasoning_conf: reasoning.confidence_score, sim_adj: simulation.confidence_adjustment },
                    output: reflectionContent as any, // Stored as jsonb
                    confidence: 1.0, // Reflections are always true records of uncertainty
                    uncertainty_flags: [],
                    model: 'reflection-engine-v1'
                })
                .select()
                .single();

            if (error) throw error;
            return data.id;

        } catch (err) {
            console.error("[ReflectionEngine] Failed to persist reflection:", err);
            return null;
        }
    }
}

export const reflectionEngine = new ReflectionEngine();
