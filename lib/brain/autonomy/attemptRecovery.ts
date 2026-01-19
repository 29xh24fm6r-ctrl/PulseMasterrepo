
import { AutonomyClass } from './types';
import { pushEvent } from '@/lib/observer/store';

const MAX_RECOVERY_ATTEMPTS = 3;

export function attemptRecovery(autonomyClass: AutonomyClass): boolean {
    // Only 'degraded' classes can attempt distinct recovery here.
    // 'locked' classes require manual user intervention (Phase 24 invariant).
    if (autonomyClass.health_state !== 'degraded') {
        return false;
    }

    const attempts = autonomyClass.recovery_attempts || 0;
    if (attempts >= MAX_RECOVERY_ATTEMPTS) {
        // Too many failed attempts. Should be locked? 
        // Logic for locking on failed attempts is handled in evaluateHealth or recordOutcome.
        return false;
    }

    // We allow a recovery attempt.
    // In practice, this means the system will tentatively suggest this action (L0)
    // and tag it as a "Recovery Opportunity".
    // If the user accepts it, we clear the bad state.

    pushEvent({
        type: 'autonomy_recovery_attempted',
        payload: { classKey: autonomyClass.classKey, attempt: attempts + 1 }
    });

    return true;
}
