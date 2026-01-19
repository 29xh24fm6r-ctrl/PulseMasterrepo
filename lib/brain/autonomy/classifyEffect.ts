import { PulseEffect } from '../writeAuthority/types';
import crypto from 'crypto';

export function classifyEffect(effect: PulseEffect): { classKey: string, fingerprint: string } {
    const fingerprint = deriveFingerprint(effect);
    const classKey = `${effect.domain}:${effect.effectType}:${fingerprint}`;
    return { classKey, fingerprint };
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

    return 'default';
}
