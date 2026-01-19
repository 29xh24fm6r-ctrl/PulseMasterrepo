
import { AutonomyClass } from './types';
import { detectContextDrift } from './detectContextDrift';
import { pushEvent } from '@/lib/observer/store';

export type HealthEvaluationResult = {
    newHealthState: 'healthy' | 'degraded' | 'locked';
    reason: string;
};

// Thresholds for Auto-Degradation
const DECAY_THRESHOLD_FOR_DEGRADE = 0.5;
const REVERTS_FOR_DEGRADE = 2;
const REVERTS_FOR_LOCK_AFTER_DEGRADE = 1;
const CONFUSION_THRESHOLD_FOR_LOCK = 5;

export function evaluateAutonomyHealth(autonomyClass: AutonomyClass): HealthEvaluationResult {
    const currentHealth = autonomyClass.health_state || 'healthy';
    const { decay_score = 0, stats } = autonomyClass;

    // 1. Check for Critical Lock Conditions first
    if (stats.confusionEvents >= CONFUSION_THRESHOLD_FOR_LOCK) {
        return { newHealthState: 'locked', reason: 'High Confusion' };
    }

    // 2. State-Specific Logic
    if (currentHealth === 'healthy') {
        // Healthy -> Degraded Transitions
        if (decay_score >= DECAY_THRESHOLD_FOR_DEGRADE) {
            return { newHealthState: 'degraded', reason: 'High Decay' };
        }
        if (detectContextDrift(autonomyClass)) {
            return { newHealthState: 'degraded', reason: 'Context Drift' };
        }
        if (stats.reverts >= REVERTS_FOR_DEGRADE) {
            return { newHealthState: 'degraded', reason: 'Repeated Reverts' };
        }
    } else if (currentHealth === 'degraded') {
        // Degraded -> Locked Transitions
        // If we reverted even once while in degraded state (which implies we tried a confirmation and user STILL reverted it?)
        // Actually, 'reverts' count is cumulative. We need to check if a revert happened *since* degradation.
        // For simplicity in this phase, we'll check total reverts against a higher threshold or use the 'last_degraded_at' timestamp compared to events.
        // Since we don't have an event history here, we will trust the caller to pass in 'justReverted' flag or similar, 
        // OR we rely on a strict rule: if you are degraded, you are L0. If you act at L0 and get reverted, that is bad.
        // But for static analysis, let's stick to safe thresholds.

        // Use a simpler heuristic: If total reverts continues to climb relative to successes?
        // Let's defer "Revert while degraded" logic to the event handler (recordOutcome).
        // Here we just check static properties.

        if (decay_score >= 0.8) {
            // Extreme decay -> Lock
            return { newHealthState: 'locked', reason: 'Severe Decay' };
        }
    }

    // Default: Maintain current state
    return { newHealthState: currentHealth, reason: 'Stable' };
}
