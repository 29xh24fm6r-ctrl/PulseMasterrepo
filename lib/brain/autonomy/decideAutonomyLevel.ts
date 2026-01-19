import { PulseEffect } from '../writeAuthority/types';
import { AutonomyClass, AutonomyDecision } from './types';
import { classifyPulseEffect } from './classifyEffect';
import { calculateEligibilityScore } from './scoreEligibility';
import { detectContextDrift } from './detectContextDrift';
import { DRIFT_PENALTY_SCORE } from './decayPolicy';
import {
    ELIGIBILITY_SCORE_FOR_L1,
    L1_CONFIRM_DOWNGRADE_THRESHOLD,
    MIN_SUCCESSES_FOR_ELIGIBLE
} from './eligibilityPolicy';

// Mock DB for Phase 19 verification
const MOCK_CLASSES: Record<string, AutonomyClass> = {};

import { DailyRunOptions } from '../dailyRun';

export function decideAutonomyLevel(effect: PulseEffect, options: DailyRunOptions = {}): AutonomyDecision {
    // 1. Classify
    const { classKey, domain, effectType, fingerprint } = classifyPulseEffect(effect);

    // 2. Check Locks
    // limit for mock purpose
    let autonomyClass = MOCK_CLASSES[classKey];

    if (!autonomyClass) {
        // Initialize if not exists (auto-discovery)
        autonomyClass = {
            classKey,
            domain: effect.domain,
            effectType: effect.effectType,
            fingerprint: classKey.split(':').pop() || '',
            status: 'locked',
            eligibilityScore: 0,
            stats: { successes: 0, confirmations: 0, rejections: 0, reverts: 0, confusionEvents: 0, ippBlocks: 0 },
            user_paused: false,
            decay_score: 0,
            context_hash: 'morning|wd|home', // Default mock context
            health_state: 'healthy',
            recovery_attempts: 0
        };
        MOCK_CLASSES[classKey] = autonomyClass;
    }

    // 2. Refresh Score
    autonomyClass.eligibilityScore = calculateEligibilityScore(autonomyClass);

    // 3. Status Transition Logic (Simplified)
    if (autonomyClass.status === 'locked') {
        if (autonomyClass.stats.successes >= MIN_SUCCESSES_FOR_ELIGIBLE) {
            autonomyClass.status = 'eligible';
        }
    }

    // Absence Dampening (Phase 21)
    if (options.isAbsent) {
        // If absent, we DO NOT upgrade 'eligible' classes to 'auto'.
        // We fundamentally downgrade potential L1 upgrades to L0 confirmations.
        return { autonomyLevel: 'L0', decisionReason: 'ABSENCE_DAMPENING', classKey };
    }

    if (autonomyClass.status === 'paused') {
        // Requires manual reset or cool-down
        return { autonomyLevel: 'L0', decisionReason: 'CLASS_PAUSED', classKey };
    }

    // User Pause (Phase 22)
    if (autonomyClass.user_paused) {
        return { autonomyLevel: 'L0', decisionReason: 'USER_PAUSED', classKey };
    }

    // Health State Enforcement (Phase 24)
    const health = autonomyClass.health_state || 'healthy';

    if (health === 'locked') {
        return { autonomyLevel: 'L0', decisionReason: 'HEALTH_LOCKED', classKey };
    }

    if (health === 'degraded') {
        // Forced L0
        return { autonomyLevel: 'L0', decisionReason: 'HEALTH_DEGRADED', classKey };
    }

    // Context Drift (Phase 23)
    // Note: evaluateHealth might have already set state to 'degraded' due to drift,
    // but we keep this dynamic check for real-time safety before next daily run syncs state.
    if (detectContextDrift(autonomyClass)) {
        return { autonomyLevel: 'L0', decisionReason: 'CONTEXT_DRIFT', classKey };
    }

    // 4. L1 Upgrade Logic (Eligible)
    if (autonomyClass.eligibilityScore >= ELIGIBILITY_SCORE_FOR_L1) {
        // Check confidence floor for upgrade
        if (effect.confidence >= L1_CONFIRM_DOWNGRADE_THRESHOLD) {
            return {
                autonomyLevel: 'L1',
                upgradedWriteMode: 'auto',
                decisionReason: 'L1_UPGRADE',
                classKey
            };
        }
    }

    return { autonomyLevel: 'L0', decisionReason: 'NO_UPGRADE', classKey };
}

// Helper to seed/mutate mock for verification
export function _setMockClass(key: string, data: Partial<AutonomyClass>) {
    MOCK_CLASSES[key] = { ...MOCK_CLASSES[key], ...data } as AutonomyClass;
}
