import { PulseEffect } from '../writeAuthority/types';
import { AutonomyDecision, AutonomyClass } from './types';
import { classifyEffect } from './classifyEffect';
import { scoreEligibility } from './scoreEligibility';
import {
    ELIGIBILITY_SCORE_FOR_L1,
    L1_CONFIRM_DOWNGRADE_THRESHOLD,
    MIN_SUCCESSES_FOR_ELIGIBLE
} from './eligibilityPolicy';

// Mock DB for Phase 19 verification
const MOCK_CLASSES: Record<string, AutonomyClass> = {};

import { DailyRunOptions } from '../dailyRun';

export function decideAutonomyLevel(effect: PulseEffect, options: DailyRunOptions = {}): AutonomyDecision {
    const { classKey } = classifyEffect(effect);

    // 1. Fetch Class State
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
            stats: { successes: 0, confirmations: 0, rejections: 0, reverts: 0, confusionEvents: 0, ippBlocks: 0 }
        };
        MOCK_CLASSES[classKey] = autonomyClass;
    }

    // 2. Refresh Score
    autonomyClass.eligibilityScore = scoreEligibility(autonomyClass.stats);

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

    if (autonomyClass.status === 'locked') {
        return { autonomyLevel: 'L0', decisionReason: 'CLASS_LOCKED', classKey };
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
