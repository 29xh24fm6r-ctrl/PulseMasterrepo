
import { PulseEffect } from './types';
import { pushEvent } from '@/lib/observer/store';
// @ts-ignore
import { revertTaskEffect } from '@/lib/domains/tasks/applyEffect';

export async function revertPulseEffect(effectId: string, effect: PulseEffect) {
    console.log(`[OWA] Reverting effect ${effectId}`);

    let reverted = false;

    if (effect.domain === 'tasks') {
        await revertTaskEffect(effect);
        reverted = true;
    } else {
        console.warn(`[OWA] No revert adapter for domain: ${effect.domain}`);
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
