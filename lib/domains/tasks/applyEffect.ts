import { PulseEffect } from '@/lib/brain/writeAuthority/types';

export async function applyTaskEffect(effect: PulseEffect) {
    if (effect.domain !== 'tasks') return;

    // In a real implementation, this would call Supabase or internal Mutations
    console.log(`[TaskAdapter] Applying effect: ${effect.effectType}`, effect.payload);

    if (effect.effectType === 'create') {
        // e.g. createTask(effect.payload)
    }
}

export async function revertTaskEffect(effect: PulseEffect) {
    if (effect.domain !== 'tasks') return;
    console.log(`[TaskAdapter] Reverting effect: ${effect.effectType}`, effect.payload);

    if (effect.effectType === 'create') {
        // e.g. deleteTask(effect.payload.id)
    }
}
