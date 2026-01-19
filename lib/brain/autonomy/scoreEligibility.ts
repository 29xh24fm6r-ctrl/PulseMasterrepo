import { AutonomyClass } from './types';

export function scoreEligibility(stats: AutonomyClass['stats']): number {
    // Simple linear scoring model for Phase 19
    const totalPositives = stats.successes + (stats.confirmations * 0.5);
    const totalNegatives = (stats.reverts * 5) + (stats.rejections * 2) + (stats.confusionEvents * 3) + stats.ippBlocks;

    if (totalPositives === 0) return 0;

    const rawScore = (totalPositives - totalNegatives) / (totalPositives + 10); // +10 Dampener
    return Math.max(0, Math.min(1, rawScore));
}
