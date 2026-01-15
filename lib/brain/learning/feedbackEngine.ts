
import { supabaseAdmin } from '../../supabase';
import { FeedbackEvent, LearningArtifact, SCORING_MATRIX, UserResponse } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Feedback Engine
 * ===============
 * 
 * The "Lizard Brain" that learns from pleasure (acceptance) and pain (rejection).
 * 
 * Invariant:
 * - Can adjustment TRUST (confidence/timing).
 * - Cannot adjust AUTHORITY (permissions/levels).
 */

export class FeedbackEngine {

    /**
     * Process a completed user interaction to generate learning.
     */
    async processFeedback(event: FeedbackEvent): Promise<LearningArtifact | null> {
        console.log(`[FeedbackEngine] Processing: ${event.response} for ${event.domain}`);

        // 1. Calculate Score
        let score = SCORING_MATRIX[event.response];

        // Latency Modifier: Quick acceptance is better
        if (event.response === 'accepted' && event.latencyMs && event.latencyMs < 5000) {
            score += 0.2;
        }
        // Long ignore is worse
        if (event.response === 'ignored' && event.latencyMs && event.latencyMs > 60000) {
            score -= 0.1;
        }

        // 2. Determine Adjustments (Heuristics)
        let confidenceDelta = 0;
        let trustDelta = 0;
        let timingShift = undefined;
        let suppression = false;
        let pattern = "";

        if (score > 0.8) {
            pattern = "Strong Positive Reinforcement";
            confidenceDelta = 0.05;
            trustDelta = 0.02;
        } else if (score > 0) {
            pattern = "Positive Reinforcement";
            confidenceDelta = 0.01;
            trustDelta = 0.01;
        } else if (score < -0.8) {
            pattern = "Strong Negative Reinforcement (Rejection)";
            confidenceDelta = -0.1;
            trustDelta = -0.05;
            suppression = true; // Back off
        } else {
            pattern = "Negative Reinforcement (Ignore)";
            trustDelta = -0.01;
            timingShift = { shiftHours: 2 }; // Try later
        }

        // 3. Create Learning Artifact (The Record)
        const artifactId = uuidv4();
        const artifact: LearningArtifact = {
            id: artifactId,
            pattern,
            confidenceDelta,
            trustDelta,
            timingShift,
            suppressionRule: suppression,
            createdAt: new Date().toISOString()
        };

        // 4. Persist Artifact
        const { error: artifactErr } = await supabaseAdmin
            .from('autonomy_learning_artifacts')
            .insert({
                id: artifactId,
                autonomy_event_id: event.eventId,
                owner_user_id: event.ownerUserId,
                pattern_detected: pattern,
                confidence_adjustment: confidenceDelta,
                timing_adjustment: timingShift,
                domain_trust_delta: trustDelta,
                suppression_rule_created: suppression
            });

        if (artifactErr) {
            console.error("Failed to persist learning artifact", artifactErr);
            throw artifactErr;
        }

        // 5. Apply to Domain Trust Profile (The Adaptation)
        // We do NOT change autonomy_level (L0/L1), only trust_score.

        // Fetch current
        const { data: currentProfile } = await supabaseAdmin
            .from('domain_trust_profile')
            .select('trust_score')
            .eq('owner_user_id', event.ownerUserId)
            .eq('domain', event.domain)
            .single();

        const currentScore = currentProfile?.trust_score || 0.5;
        const newScore = Math.max(0.1, Math.min(0.95, currentScore + trustDelta));

        await supabaseAdmin
            .from('domain_trust_profile')
            .upsert({
                owner_user_id: event.ownerUserId,
                domain: event.domain,
                trust_score: newScore,
                updated_at: new Date().toISOString()
            }, { onConflict: 'owner_user_id, domain' });

        // 6. Update the Event itself directly with outcome
        await supabaseAdmin
            .from('autonomy_events')
            .update({
                user_response: event.response,
                learning_applied: true
            })
            .eq('id', event.eventId);

        return artifact;
    }
}

export const feedbackEngine = new FeedbackEngine();
