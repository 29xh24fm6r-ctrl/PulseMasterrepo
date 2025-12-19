"use client";

import { useEffect, useState } from "react";

type HealthData = {
  counts: {
    queued: number;
    running: number;
    succeeded: number;
    failed: number;
  };
  oldest_queued: {
    id: string;
    user_id: string;
    job_type: string;
    lane: string;
    priority: number;
    created_at: string;
  } | null;
  oldest_age_seconds: number | null;
  stuck_running: Array<{
    id: string;
    user_id: string;
    job_type: string;
    locked_at: string;
  }>;
  budget_exhausted: Array<{
    user_id: string;
    spent: number;
    budget: number;
  }>;
  rate_window_exhausted: Array<{
    user_id: string;
    spent: number;
    limit: number;
  }>;
  lane_quota_exhausted: Array<{
    user_id: string;
    lane: string;
    spent: number;
    quota: number;
  }>;
  starving_jobs: Array<{
    id: string;
    user_id: string;
    job_type: string;
    lane: string;
    priority: number;
    created_at: string;
  }>;
};

function fmt(ts?: string | null) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function fmtAge(seconds: number | null) {
  if (seconds === null) return "N/A";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}

export default function SchedulerHealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/job-queue/health");
      const j = await r.json();
      setHealth(j);
    } finally {
      setLoading(false);
    }
  };

  const tickNow = async () => {
    await fetch("/api/job-queue/tick", { method: "POST" });
    await fetchHealth();
  };

  const recoverStuck = async () => {
    await fetch("/api/cron/job-queue/recover-stuck", {
      method: "POST",
      headers: { "x-cron-secret": process.env.NEXT_PUBLIC_CRON_SECRET || "" },
    });
    await fetchHealth();
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-semibold">Scheduler Health Dashboard</div>
          <div className="text-sm text-zinc-400">C5 Scheduler v3 • Real-time monitoring</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded bg-zinc-800 px-3 py-1 text-sm hover:bg-zinc-700"
            onClick={fetchHealth}
            disabled={loading}
          >
            Refresh
          </button>

          <button
            className="rounded bg-indigo-600 px-3 py-1 text-sm hover:bg-indigo-500"
            onClick={tickNow}
          >
            Tick Now
          </button>

          <button
            className="rounded bg-amber-600 px-3 py-1 text-sm hover:bg-amber-500"
            onClick={recoverStuck}
          >
            Recover Stuck
          </button>
        </div>
      </div>

      {loading && !health ? (
        <div className="text-sm text-zinc-400">Loading...</div>
      ) : health ? (
        <>
          {/* Global Queue Health */}
          <div className="rounded border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-sm font-medium mb-3">Global Queue Health</div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-zinc-400">Queued</div>
                <div className="text-lg font-semibold">{health.counts.queued}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">Running</div>
                <div className="text-lg font-semibold">{health.counts.running}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">Succeeded</div>
                <div className="text-lg font-semibold text-green-300">{health.counts.succeeded}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">Failed</div>
                <div className="text-lg font-semibold text-red-300">{health.counts.failed}</div>
              </div>
            </div>

            {health.oldest_queued && (
              <div className="mt-3 pt-3 border-t border-zinc-800">
                <div className="text-xs text-zinc-400">Oldest Queued Job</div>
                <div className="text-sm mt-1">
                  {health.oldest_queued.job_type} ({health.oldest_queued.lane}) • Age:{" "}
                  {fmtAge(health.oldest_age_seconds)}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  Created: {fmt(health.oldest_queued.created_at)}
                </div>
              </div>
            )}

            {health.stuck_running.length > 0 && (
              <div className="mt-3 pt-3 border-t border-zinc-800">
                <div className="text-xs text-red-400 mb-2">
                  ⚠️ {health.stuck_running.length} jobs stuck running
                </div>
                <div className="space-y-1">
                  {health.stuck_running.slice(0, 5).map((job) => (
                    <div key={job.id} className="text-xs text-zinc-400">
                      {job.job_type} • Locked: {fmt(job.locked_at)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Fairness + Quotas */}
          <div className="rounded border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-sm font-medium mb-3">Fairness + Quotas</div>

            {health.budget_exhausted.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-red-400 mb-1">
                  Budget Exhausted: {health.budget_exhausted.length} users
                </div>
                <div className="space-y-1">
                  {health.budget_exhausted.slice(0, 5).map((b, i) => (
                    <div key={i} className="text-xs text-zinc-400">
                      User {b.user_id.slice(0, 8)}... • {b.spent}/{b.budget}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {health.rate_window_exhausted.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-red-400 mb-1">
                  Rate Window Exhausted: {health.rate_window_exhausted.length} users
                </div>
                <div className="space-y-1">
                  {health.rate_window_exhausted.slice(0, 5).map((r, i) => (
                    <div key={i} className="text-xs text-zinc-400">
                      User {r.user_id.slice(0, 8)}... • {r.spent}/{r.limit}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {health.lane_quota_exhausted.length > 0 && (
              <div>
                <div className="text-xs text-red-400 mb-1">
                  Lane Quota Exhausted: {health.lane_quota_exhausted.length} lanes
                </div>
                <div className="space-y-1">
                  {health.lane_quota_exhausted.slice(0, 5).map((l, i) => (
                    <div key={i} className="text-xs text-zinc-400">
                      User {l.user_id.slice(0, 8)}... • {l.lane}: {l.spent}/{l.quota}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {health.budget_exhausted.length === 0 &&
              health.rate_window_exhausted.length === 0 &&
              health.lane_quota_exhausted.length === 0 && (
                <div className="text-xs text-zinc-400">No quota/budget exhaustion detected</div>
              )}
          </div>

          {/* Starvation Watchlist */}
          {health.starving_jobs.length > 0 && (
            <div className="rounded border border-zinc-800 bg-zinc-950 p-4">
              <div className="text-sm font-medium mb-3">Starvation Watchlist</div>
              <div className="space-y-2">
                {health.starving_jobs.map((job) => {
                  const age = Math.floor(
                    (Date.now() - new Date(job.created_at).getTime()) / 1000
                  );
                  return (
                    <div key={job.id} className="rounded border border-zinc-800 p-2">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-medium">{job.job_type}</span>
                          <span className="text-zinc-400 ml-2">
                            ({job.lane}) • prio {job.priority}
                          </span>
                        </div>
                        <div className="text-red-400">Age: {fmtAge(age)}</div>
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">
                        Created: {fmt(job.created_at)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

