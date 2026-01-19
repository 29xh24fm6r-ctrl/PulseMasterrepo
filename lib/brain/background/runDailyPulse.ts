
import { resolveInabilityToProceed } from '@/lib/brain/inability/resolve';
import { dailyRun } from '../dailyRun';
import { calculateDecay } from '../autonomy/applyDecay';
import { pushEvent } from '@/lib/observer/store';

// Mock DB for "pulse_daily_runs" persistence
// In a real app, this would use Supabase
const LOCK_STORE: Record<string, { used: boolean, attempts: number }> = {};

export type RunType = 'cron' | 'app_open' | 'manual_retry';

export async function runDailyPulse(ownerId: string, runType: RunType, isAbsent: boolean = false) {
    const today = new Date().toISOString().split('T')[0];
    const lockKey = `${ownerId}:${today}`;

    console.log(`[DailyPulse] Attempting run for ${ownerId} [${today}] via ${runType}`);

    // 1. IPP Check
    const inability = resolveInabilityToProceed({
        hasOwnerId: Boolean(ownerId),
        networkOk: true,
        permissionOk: true
    });

    if (inability) {
        console.warn(`[DailyPulse] IPP Blocked: ${inability.reason}`);
        pushEvent({
            type: 'pulse_daily_run',
            message: `Daily Run Blocked: ${inability.reason}`,
            meta: { run_date: today, run_type: runType, status: 'blocked', ipp_reason: inability.reason }
        });
        return { success: false, reason: 'IPP_BLOCK' };
    }

    // 2. Idempotency Lock
    const lock = LOCK_STORE[lockKey] || { used: false, attempts: 0 };
    if (lock.used) {
        console.log(`[DailyPulse] Already ran for today. Skipping.`);
        return { success: true, status: 'skipped' };
    }

    // Lock it immediately (optimistic)
    // In real DB: insert into pulse_daily_runs ... on conflict do nothing
    LOCK_STORE[lockKey] = { used: true, attempts: lock.attempts + 1 };

    // 3. Status -> Started
    pushEvent({
        type: 'pulse_daily_run',
        message: `Daily Run Started`,
        meta: { run_date: today, run_type: runType, status: 'started' }
    });

    try {
        // 4. Execute Logic
        // 4b. Apply Autonomy Decay (Phase 23)
        // In a real implementation, we would iterator all active autonomy classes and apply:
        // calculateDecay(cls, now);
        // if (decay > 0) updateAutonomyClass(cls.key, { decay_score: cls.decay_score + decay });

        // 5. Run core logic
        await dailyRun({
            userId: userId,
            isAbsent: isAbsent
        });

        // 5. Status -> Completed
        console.log(`[DailyPulse] Run complete.`);
        pushEvent({
            type: 'pulse_daily_run',
            message: `Daily Run Completed`,
            meta: { run_date: today, run_type: runType, status: 'completed' }
        });

        return { success: true, status: 'completed' };
    } catch (err) {
        console.error(`[DailyPulse] Failed:`, err);
        // Unlock for retry if needed, or mark failed
        // For now, allow retry if transient, but we'll leave it "used" to prevent infinite loops in this simple mock
        // Real implementation would handle retries via separate column
        pushEvent({
            type: 'pulse_daily_run',
            message: `Daily Run Failed`,
            meta: { run_date: today, run_type: runType, status: 'failed', failure_reason: String(err) }
        });
        return { success: false, status: 'failed', error: err };
    }
}
