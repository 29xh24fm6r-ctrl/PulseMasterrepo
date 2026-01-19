
import { PulseEffect } from './types';
import { getWriteMode } from './confidencePolicy';
import { resolveInabilityToProceed } from '../inability/resolve';
import { pushEvent } from '@/lib/observer/store';
// import { applyTaskEffect } from '@/lib/domains/tasks/applyEffect'; // Will link dynamically
import { speak } from '@/lib/voice/speechAuthority';
// @ts-ignore - dynamic imports or manual switch needed until registry exists
import { applyTaskEffect } from '@/lib/domains/tasks/applyEffect';

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

    // 2. Confidence Policy
    const writeMode = getWriteMode(effect.confidence);

    // 3. Persist to DB (Mock/Real)
    // In real env: insert into pulse_effects ...
    // For now we assume optimistic success or verify verification script mocks this step.

    let applied = false;

    // 4. Auto-Apply
    if (writeMode === 'auto') {
        if (effect.domain === 'tasks') {
            await applyTaskEffect(effect);
            applied = true;

            // 7. Voice Explanation (Auto only)
            if (effect.source === 'daily_run') {
                speak(`I've auto-created a task based on our plan.`);
            }
        } else {
            console.warn(`[PulseEffect] No adapter for domain: ${effect.domain}`);
        }
    }

    // 6. Notify Observer
    pushEvent({
        type: 'pulse_effect',
        route: 'brain_executor',
        message: `Effect [${writeMode}]: ${effect.domain} / ${effect.effectType}`,
        meta: { ...effect, applied, writeMode }
    });

    return { success: true, writeMode, applied };
}
