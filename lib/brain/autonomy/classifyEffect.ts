import { PulseEffect } from '../writeAuthority/types';
import crypto from 'crypto';

export function classifyPulseEffect(effect: PulseEffect): { classKey: string, fingerprint: string, domain: string, effectType: string } {
    const fingerprint = deriveFingerprint(effect);
    const classKey = `${effect.domain}:${effect.effectType}:${fingerprint}`;
    return { classKey, fingerprint, domain: effect.domain, effectType: effect.effectType };
}

function deriveFingerprint(effect: PulseEffect): string {
    // Extract stable fields based on domain
    // For tasks, we might look at 'kind' or normalized 'action'
    // This is a simplified version for Phase 19 verification

    if (effect.domain === 'tasks') {
        // Example: tasks:create:generic
        // Real implementation would look at payload structure
        const keys = Object.keys(effect.payload).sort().join('_');
        return `struct_${keys}`;
    }

    if (effect.domain === 'chef') {
        // e.g. chef:add_missing_grocery_item
        // fingerprint by explicit 'action' if present, or fallback to key sort
        if (effect.effectType === 'update' && effect.payload.action) {
            return `action_${effect.payload.action}`;
        }
        const keys = Object.keys(effect.payload).sort().join('_');
        return `struct_${keys}`;
    }

    if (effect.domain === 'planning') {
        // e.g. planning:adjust_daily_priorities
        const keys = Object.keys(effect.payload).sort().join('_');
        return `struct_${keys}`;
    }

    if (effect.domain === 'life_state') {
        // e.g. life_state:damp_overload
        const keys = Object.keys(effect.payload).sort().join('_');
        return `struct_${keys}`;
    }

    return 'default';
}
