
import { PulseEffect } from './types';
import { pushEvent } from '@/lib/observer/store';
// @ts-ignore
import { revertTaskEffect } from '@/lib/domains/tasks/applyEffect';
// @ts-ignore
import { revertChefEffect } from '@/lib/domains/chef/applyEffect';
// @ts-ignore
import { revertPlanningEffect } from '@/lib/domains/planning/applyEffect';
// @ts-ignore
import { revertLifeStateEffect } from '@/lib/domains/life_state/applyEffect';

import { recordOutcome } from '../autonomy/recordOutcome';

export async function revertPulseEffect(effectId: string, effect: PulseEffect) {
    console.log(`[OWA] Reverting effect ${effectId}`);

    const originalEffect = effect;

    // 1. Route to Domain
    let result = { success: false, reverted: false };

    if (originalEffect.domain === 'tasks') {
        result = await revertTaskEffect(originalEffect);
    } else if (originalEffect.domain === 'chef') {
        result = await revertChefEffect(originalEffect);
    } else if (originalEffect.domain === 'planning') {
        result = await revertPlanningEffect(originalEffect);
    } else if (originalEffect.domain === 'life_state') {
        result = await revertLifeStateEffect(originalEffect);
    } else {
        console.warn(`[OWA] No revert adapter for domain: ${originalEffect.domain}`);
    }

    // 2. Record Outcome (This triggers Pausing if threshold exceeded)
    if (result.reverted) {
        await recordOutcome(originalEffect, 'revert');
    }

    // In a real implementation: Update DB set reverted = true

    pushEvent({
        type: 'pulse_effect',
        route: 'brain_reverter',
        message: `Reverted: ${effect.domain} / ${effect.effectType}`,
        meta: { ...effect, reverted: true, originalId: effectId }
    });

    return { success: true, reverted };
}
