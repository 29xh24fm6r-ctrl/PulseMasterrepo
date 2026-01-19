
import { PulseEffect } from './types';
import { getWriteMode } from './confidencePolicy';
import { resolveInabilityToProceed } from '../inability/resolve';
import { pushEvent } from '@/lib/observer/store';
// import { applyTaskEffect } from '@/lib/domains/tasks/applyEffect'; // Will link dynamically
import { speak } from '@/lib/voice/speechAuthority';
// @ts-ignore - dynamic imports or manual switch needed until registry exists
import { applyTaskEffect } from '@/lib/domains/tasks/applyEffect';
// @ts-ignore 
import { applyChefEffect } from '@/lib/domains/chef/applyEffect';
// @ts-ignore
import { applyPlanningEffect } from '@/lib/domains/planning/applyEffect';
// @ts-ignore
import { applyLifeStateEffect } from '@/lib/domains/life_state/applyEffect';

import { decideAutonomyLevel } from '../autonomy/decideAutonomyLevel';
import { recordOutcome } from '../autonomy/recordOutcome';

export async function executePulseEffect(effect: PulseEffect, ownerId: string) {
    // 1. IPP Check
    const inability = resolveInabilityToProceed({
        hasOwnerId: Boolean(ownerId),
        networkOk: true, // simplified for server/hybrid context
        permissionOk: true
    });

    if (inability) {
        console.warn(`[PulseEffect] Blocked by IPP: ${inability.reason}`);
        pushEvent({
            type: 'inability',
            route: 'brain_executor',
            reason: inability.reason,
            message: `Write blocked: ${inability.explanation}`
        });
        return { success: false, reason: 'IPP_BLOCK' };
    }


    // 2. Autonomy Decision (L1 Hook)
    // Default to L0
    let writeMode = getWriteMode(effect.confidence);
    let autonomyLevel = 'L0';
    let decisionReason = 'CONFIDENCE_POLICY';
    let classKey: string | undefined;

    // Hook: Ask L1 Decision Engine
    // Only if not already auto (no need to upgrade if already high confidence)
    if (writeMode !== 'auto') {
        const decision = decideAutonomyLevel(effect);
        autonomyLevel = decision.autonomyLevel;
        classKey = decision.classKey;

        if (decision.autonomyLevel === 'L1' && decision.upgradedWriteMode) {
            writeMode = decision.upgradedWriteMode;
            decisionReason = decision.decisionReason;
            console.log(`[PulseEffect] L1 UPGRADE: ${writeMode} (${decisionReason})`);
        } else {
            decisionReason = decision.decisionReason;
        }
    } else {
        // Classify anyway for logging
        const decision = decideAutonomyLevel(effect);
        classKey = decision.classKey;
    }

    // 3. Persist to DB (Mock/Real)
    // insert into pulse_effects (..., autonomy_level, autonomy_class_key, decision_reason)

    let applied = false;

    // 4. Auto-Apply
    if (writeMode === 'auto') {
        if (effect.domain === 'tasks') {
            await applyTaskEffect(effect);
            applied = true;
        } else if (effect.domain === 'chef') {
            await applyChefEffect(effect);
            applied = true;
        } else if (effect.domain === 'planning') {
            await applyPlanningEffect(effect);
            applied = true;
        } else if (effect.domain === 'life_state') {
            await applyLifeStateEffect(effect);
            applied = true;
        } else {
            console.warn(`[PulseEffect] No adapter for domain: ${effect.domain}`);
        }

        if (applied) {
            // 5. Outcome Recording (Success)
            await recordOutcome(effect, 'success');

            // 7. Voice Explanation (Auto only)
            if (effect.source === 'daily_run') {
                if (autonomyLevel === 'L1') {
                    speak(`I've auto-handled a routine update based on our history.`);
                } else {
                    speak(`I've auto-created a task based on our plan.`);
                }
            }
        }
    }

    // 6. Notify Observer
    pushEvent({
        type: 'pulse_effect',
        route: 'brain_executor',
        message: `Effect [${writeMode}]: ${effect.domain} / ${effect.effectType}`,
        meta: {
            ...effect,
            applied,
            writeMode,
            autonomyLevel,
            classKey,
            decisionReason
        }
    });

    return { success: true, writeMode, applied, autonomyLevel, decisionReason };
}
