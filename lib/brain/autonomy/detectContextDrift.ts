
import { AutonomyClass } from './types';
import { deriveContextHash, getCurrentContext } from './contextFingerprint';

export function detectContextDrift(autonomyClass: AutonomyClass): boolean {
    if (!autonomyClass.context_hash) {
        // No history yet, so technically no drift, or acceptable to start fresh
        return false;
    }

    const currentContext = getCurrentContext();
    const currentHash = deriveContextHash(currentContext);

    return currentHash !== autonomyClass.context_hash;
}
