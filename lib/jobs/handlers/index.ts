import type { JobHandler, JobName } from "./types";

import { handleEmailTriage } from "./email_triage";
import { handleFollowupSuggest } from "./followup_suggest";
import { handleQuestGenerate } from "./quest_generate";
import { openThreadSweepHandler } from "./open_thread_sweep";
import { dailyActivityRollupRefreshHandler } from "./dailyActivityRollupRefresh";
import { handleUserDailyActivityRollupRefresh } from "./userDailyActivityRollupRefresh";
import { rollupBackfillNightly } from "./rollupBackfillNightly";
import { userDailySignalsCompute } from "./userDailySignalsCompute";
import { signalsCachePruneWeekly } from "./signalsCachePruneWeekly";
import { signalsCacheWarm30d } from "./signalsCacheWarm30d";

// Explicitly cast imported handlers to JobHandler<any> to satisfy registry type
// This handles any minor signature variance as long as runtime behavior is correct
const handlers: Record<JobName, JobHandler<any>> = {
    email_triage: handleEmailTriage as JobHandler<any>,
    followup_suggest: handleFollowupSuggest as JobHandler<any>,
    quest_generate: handleQuestGenerate as JobHandler<any>,
    open_thread_sweep: openThreadSweepHandler as unknown as JobHandler<any>,
    daily_activity_rollup_refresh: dailyActivityRollupRefreshHandler as JobHandler<any>,
    user_daily_activity_rollup_refresh: handleUserDailyActivityRollupRefresh as JobHandler<any>,
    rollup_backfill_nightly: rollupBackfillNightly as JobHandler<any>,
    user_daily_signals_compute: userDailySignalsCompute as JobHandler<any>,
    signals_cache_prune_weekly: signalsCachePruneWeekly as JobHandler<any>,
    signals_cache_warm_30d: signalsCacheWarm30d as JobHandler<any>,
};

export function getJobHandler(name: JobName): JobHandler<any> {
    const h = handlers[name];
    if (!h) {
        // If we have a job in the queue that isn't registered, we throw.
        // The worker will catch this and fail the job.
        throw new Error(`getJobHandler: No handler registered for job: ${name}`);
    }
    return h;
}

export type { JobName };
