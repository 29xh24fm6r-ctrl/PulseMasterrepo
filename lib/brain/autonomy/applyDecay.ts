
import { AutonomyClass } from './types';
import { INACTIVITY_DECAY_DAYS, MAX_DECAY_SCORE } from './decayPolicy';

export function calculateDecay(autonomyClass: AutonomyClass, nowOverride?: Date): number {
    if (!autonomyClass.last_success_at) {
        return 0; // Fresh class, or never succeeded. No decay yet.
    }

    const now = nowOverride || new Date();
    const lastSuccess = new Date(autonomyClass.last_success_at);
    const diffTime = Math.abs(now.getTime() - lastSuccess.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= INACTIVITY_DECAY_DAYS) {
        return 0; // Still fresh
    }

    // Simple linear decay after threshold for Phase 23
    // 0.1 penalty per day overdue
    const overdueDays = diffDays - INACTIVITY_DECAY_DAYS;
    const decay = overdueDays * 0.1;

    return Math.min(decay, MAX_DECAY_SCORE);
}
