import { AutonomyClass } from './types';
import { ELIGIBILITY_SCORE_FOR_L1 } from './eligibilityPolicy';

export function calculateEligibilityScore(autonomyClass: AutonomyClass): number {
    const { successes, rejections, reverts, confusionEvents, ippBlocks } = autonomyClass.stats;
    const decay = autonomyClass.decay_score || 0;

    // Base Calculation (Phase 19 logic)
    // +1 per success
    // -5 per rejection
    // -10 per revert
    // -2 per confusion/IPP

    let score = (successes * 1.0)
        - (rejections * 5.0)
        - (reverts * 10.0)
        - (confusionEvents * 2.0)
        - (ippBlocks * 2.0);

    // Normalize to 0-1 range (approximate sigmoid or capped)
    // Only positive net score counts
    if (score < 0) score = 0;

    // Simple cap for v1
    let normalized = Math.min(score / 20, 1.0); // 20 successes = 1.0

    // Phase 23: Apply Decay
    // Decay is a direct subtraction from the normalized confidence
    normalized = Math.max(0, normalized - decay);

    return normalized;
}
