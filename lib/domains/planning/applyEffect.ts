import { PulseEffect } from '@/lib/brain/writeAuthority/types';

export async function applyPlanningEffect(effect: PulseEffect) {
    console.log(`[PlanningAdapter] Applying effect: ${effect.effectType}`, effect.payload);
    return { success: true };
}

export async function revertPlanningEffect(effect: PulseEffect) {
    console.log(`[PlanningAdapter] Reverting effect: ${effect.effectType}`, effect.payload);
    return { success: true, reverted: true };
}
