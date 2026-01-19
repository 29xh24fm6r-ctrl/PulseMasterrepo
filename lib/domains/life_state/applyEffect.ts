import { PulseEffect } from '@/lib/brain/writeAuthority/types';

export async function applyLifeStateEffect(effect: PulseEffect) {
    console.log(`[LifeStateAdapter] Applying effect: ${effect.effectType}`, effect.payload);
    return { success: true };
}

export async function revertLifeStateEffect(effect: PulseEffect) {
    console.log(`[LifeStateAdapter] Reverting effect: ${effect.effectType}`, effect.payload);
    return { success: true, reverted: true };
}
