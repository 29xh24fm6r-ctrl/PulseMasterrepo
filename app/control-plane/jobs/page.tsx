"use client";

import { useEffect, useMemo, useState } from "react";

type Job = {
  id: string;
  job_type: string;
  status: string;
  priority: number;
  attempts: number;
  max_attempts: number;
  run_at: string;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  last_error?: string | null;
  payload?: any;
  lane?: string;
  cost?: number;
};

type JobEvent = {
  id: string;
  ts: string;
  level: string;
  message: string;
  meta: any;
};

function fmt(ts?: string | null) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export default function JobsControlPlanePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [status, setStatus] = useState<string>("");
  const [lane, setLane] = useState<string>("");
  const [starvingOnly, setStarvingOnly] = useState(false);
  const [quotaBlockedOnly, setQuotaBlockedOnly] = useState(false);
  const [rateLimitedOnly, setRateLimitedOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [events, setEvents] = useState<JobEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const [budget, setBudget] = useState<{ budget: number; spent: number } | null>(null);
  const [budgetLoading, setBudgetLoading] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (status) qs.set("status", status);
      if (lane) qs.set("lane", lane);
      qs.set("limit", "80");

      const r = await fetch(`/api/job-queue/list?${qs.toString()}`);
      const j = await r.json();
      setJobs(j?.jobs ?? []);
    } finally {
      setLoading(false);
    }
  };

  const runOne = async () => {
    await fetch("/api/job-queue/run", { method: "POST" });
    await fetchJobs();
  };

  const tick = async () => {
    await fetch("/api/job-queue/tick", { method: "POST" });
    await fetchJobs();
  };

  const requeue = async (jobId: string) => {
    await fetch("/api/job-queue/requeue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId }),
    });
    await fetchJobs();
    if (selectedJobId === jobId) await fetchEvents(jobId);
  };

  const fetchEvents = async (jobId: string) => {
    setEventsLoading(true);
    try {
      const r = await fetch(`/api/job-queue/events?job_id=${encodeURIComponent(jobId)}`);
      const j = await r.json();
      setEvents(j?.events ?? []);
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchBudget = async (userId: string) => {
    setBudgetLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const r = await fetch(`/api/job-queue/budget?user_id=${encodeURIComponent(userId)}&days=1`);
      const j = await r.json();
      const todayBudget = j?.budgets?.find((b: any) => b.day === today);
      if (todayBudget) {
        setBudget({ budget: todayBudget.budget, spent: todayBudget.spent });
      } else {
        setBudget({ budget: 100, spent: 0 }); // Default
      }
    } catch {
      setBudget(null);
    } finally {
      setBudgetLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, lane]);

  // Fetch budget when jobs load (use first job's user_id if available)
  useEffect(() => {
    if (jobs.length > 0 && jobs[0].user_id) {
      fetchBudget(jobs[0].user_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs.length > 0 ? jobs[0].user_id : null]);

  const selected = useMemo(
    () => jobs.find((x) => x.id === selectedJobId) ?? null,
    [jobs, selectedJobId]
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">Control Plane</div>
          <div className="text-sm text-zinc-400">Job Queue • user-scoped view</div>
        </div>

        <div className="flex items-center gap-2">
          {budget && (
            <div className={`rounded px-2 py-1 text-xs ${
              budget.spent >= budget.budget
                ? "bg-red-900/50 text-red-300"
                : budget.spent >= budget.budget * 0.8
                ? "bg-amber-900/50 text-amber-300"
                : "bg-zinc-800 text-zinc-300"
            }`}>
              Budget: {budget.spent}/{budget.budget}
              {budget.spent >= budget.budget && " (exhausted)"}
            </div>
          )}

          <select
            className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="queued">queued</option>
            <option value="running">running</option>
            <option value="succeeded">succeeded</option>
            <option value="failed">failed</option>
          </select>

          <select
            className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm"
            value={lane}
            onChange={(e) => setLane(e.target.value)}
          >
            <option value="">All Lanes</option>
            <option value="interactive">interactive</option>
            <option value="default">default</option>
            <option value="cron">cron</option>
          </select>

          <label className="flex items-center gap-1 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={starvingOnly}
              onChange={(e) => setStarvingOnly(e.target.checked)}
              className="rounded"
            />
            Starving only
          </label>

          <label className="flex items-center gap-1 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={quotaBlockedOnly}
              onChange={(e) => setQuotaBlockedOnly(e.target.checked)}
              className="rounded"
            />
            Quota blocked
          </label>

          <label className="flex items-center gap-1 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={rateLimitedOnly}
              onChange={(e) => setRateLimitedOnly(e.target.checked)}
              className="rounded"
            />
            Rate limited
          </label>

          <button
            className="rounded bg-zinc-800 px-3 py-1 text-sm hover:bg-zinc-700"
            onClick={fetchJobs}
            disabled={loading}
          >
            Refresh
          </button>

          <button
            className="rounded bg-indigo-600 px-3 py-1 text-sm hover:bg-indigo-500"
            onClick={runOne}
          >
            Run One
          </button>

          <button
            className="rounded bg-indigo-600 px-3 py-1 text-sm hover:bg-indigo-500"
            onClick={tick}
          >
            Tick x5
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Jobs list */}
        <div className="lg:col-span-2 rounded border border-zinc-800 bg-zinc-950">
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <div className="text-sm font-medium">Jobs</div>
            <div className="text-xs text-zinc-400">{loading ? "Loading…" : `${jobs.length} rows`}</div>
          </div>

          <div className="max-h-[70vh] overflow-auto">
            {jobs.map((j) => (
              <button
                key={j.id}
                onClick={() => {
                  setSelectedJobId(j.id);
                  fetchEvents(j.id);
                }}
                className={[
                  "w-full text-left px-3 py-2 border-b border-zinc-900 hover:bg-zinc-900/60",
                  selectedJobId === j.id ? "bg-zinc-900/70" : "",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">{j.job_type}</div>
                  <div className="text-xs text-zinc-400">{fmt(j.created_at)}</div>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-zinc-800 px-2 py-0.5">{j.status}</span>
                  {j.lane && (
                    <span className={`rounded px-2 py-0.5 ${
                      j.lane === 'interactive' ? 'bg-blue-900/50 text-blue-300' :
                      j.lane === 'default' ? 'bg-zinc-800' :
                      'bg-purple-900/50 text-purple-300'
                    }`}>
                      {j.lane}
                    </span>
                  )}
                  <span className="rounded bg-zinc-800 px-2 py-0.5">prio {j.priority}</span>
                  {j.cost && j.cost > 1 && (
                    <span className="rounded bg-amber-900/50 px-2 py-0.5 text-amber-300">
                      cost {j.cost}
                    </span>
                  )}
                  {(() => {
                    const age = Math.floor((Date.now() - new Date(j.created_at).getTime()) / 1000);
                    const isStarving = age > 600;
                    return isStarving ? (
                      <span className="rounded bg-red-900/50 px-2 py-0.5 text-red-300">
                        ⚠️ starving ({Math.floor(age / 60)}m)
                      </span>
                    ) : null;
                  })()}
                  <span className="rounded bg-zinc-800 px-2 py-0.5">
                    attempts {j.attempts}/{j.max_attempts}
                  </span>
                  <span className="text-zinc-400">run_at {fmt(j.run_at)}</span>
                </div>

                {j.last_error ? (
                  <div className="mt-1 text-xs text-red-400 line-clamp-2">{j.last_error}</div>
                ) : null}
              </button>
            ))}

            {jobs.length === 0 && !loading ? (
              <div className="p-6 text-sm text-zinc-400">No jobs.</div>
            ) : null}
          </div>
        </div>

        {/* Details + events */}
        <div className="rounded border border-zinc-800 bg-zinc-950">
          <div className="p-3 border-b border-zinc-800">
            <div className="text-sm font-medium">Job Details</div>
          </div>

          {!selected ? (
            <div className="p-6 text-sm text-zinc-400">Select a job to view details.</div>
          ) : (
            <div className="p-3 space-y-3">
              <div className="text-xs text-zinc-400">ID</div>
              <div className="text-xs font-mono break-all">{selected.id}</div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-zinc-400">Status</div>
                  <div>{selected.status}</div>
                </div>
                <div>
                  <div className="text-zinc-400">Priority</div>
                  <div>{selected.priority}</div>
                </div>
                <div>
                  <div className="text-zinc-400">Created</div>
                  <div>{fmt(selected.created_at)}</div>
                </div>
                <div>
                  <div className="text-zinc-400">Run At</div>
                  <div>{fmt(selected.run_at)}</div>
                </div>
                <div>
                  <div className="text-zinc-400">Started</div>
                  <div>{fmt(selected.started_at ?? null)}</div>
                </div>
                <div>
                  <div className="text-zinc-400">Finished</div>
                  <div>{fmt(selected.finished_at ?? null)}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="rounded bg-zinc-800 px-3 py-1 text-sm hover:bg-zinc-700"
                  onClick={() => fetchEvents(selected.id)}
                  disabled={eventsLoading}
                >
                  Refresh Events
                </button>

                <button
                  className="rounded bg-amber-600 px-3 py-1 text-sm hover:bg-amber-500"
                  onClick={() => requeue(selected.id)}
                >
                  Requeue
                </button>
              </div>

              {selected.last_error ? (
                <div className="rounded border border-red-900 bg-red-950/30 p-2 text-xs text-red-300 whitespace-pre-wrap">
                  {selected.last_error}
                </div>
              ) : null}

              <div className="border-t border-zinc-800 pt-3">
                <div className="text-sm font-medium mb-2">Events</div>
                <div className="max-h-[40vh] overflow-auto space-y-2">
                  {eventsLoading ? (
                    <div className="text-sm text-zinc-400">Loading…</div>
                  ) : (
                    events.map((e) => (
                      <div key={e.id} className="rounded border border-zinc-800 p-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="rounded bg-zinc-800 px-2 py-0.5">{e.level}</div>
                          <div className="text-zinc-400">{fmt(e.ts)}</div>
                        </div>
                        <div className="mt-1 text-sm">{e.message}</div>
                        {e.meta && Object.keys(e.meta).length ? (
                          <pre className="mt-2 text-xs text-zinc-300 whitespace-pre-wrap break-words">
                            {JSON.stringify(e.meta, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    ))
                  )}

                  {!eventsLoading && events.length === 0 ? (
                    <div className="text-sm text-zinc-400">No events yet.</div>
                  ) : null}
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-3">
                <div className="text-sm font-medium mb-2">Payload</div>
                <pre className="text-xs text-zinc-300 whitespace-pre-wrap break-words">
                  {JSON.stringify(selected.payload ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

