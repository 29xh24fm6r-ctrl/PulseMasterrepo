"use client";

import { useEffect, useMemo, useState } from "react";

type Run = {
  correlation_id: string;
  last_ts: string;
  counts: {
    queued: number;
    running: number;
    succeeded: number;
    failed: number;
  };
  sample_job_types?: string[];
};

type Job = {
  id: string;
  job_type: string;
  status: string;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  last_error?: string | null;
  payload?: any;
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

export default function RunsControlPlanePage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedCorrelationId, setSelectedCorrelationId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [events, setEvents] = useState<JobEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/job-queue/runs?limit=50");
      const j = await r.json();
      setRuns(j?.runs ?? []);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async (correlationId: string) => {
    setJobsLoading(true);
    try {
      const r = await fetch(`/api/job-queue/by-correlation?correlation_id=${encodeURIComponent(correlationId)}`);
      const j = await r.json();
      setJobs(j?.jobs ?? []);
    } finally {
      setJobsLoading(false);
    }
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

  useEffect(() => {
    fetchRuns();
  }, []);

  useEffect(() => {
    if (selectedCorrelationId) {
      fetchJobs(selectedCorrelationId);
    } else {
      setJobs([]);
    }
  }, [selectedCorrelationId]);

  const selectedRun = useMemo(
    () => runs.find((r) => r.correlation_id === selectedCorrelationId) ?? null,
    [runs, selectedCorrelationId]
  );

  const selectedJob = useMemo(
    () => jobs.find((j) => j.id === selectedJobId) ?? null,
    [jobs, selectedJobId]
  );

  const totalJobs = useMemo(() => {
    if (!selectedRun) return 0;
    return selectedRun.counts.queued + selectedRun.counts.running + selectedRun.counts.succeeded + selectedRun.counts.failed;
  }, [selectedRun]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">Control Plane v2</div>
          <div className="text-sm text-zinc-400">Correlation Runs • grouped by correlation_id</div>
        </div>

        <button
          className="rounded bg-zinc-800 px-3 py-1 text-sm hover:bg-zinc-700"
          onClick={fetchRuns}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Runs list */}
        <div className="lg:col-span-1 rounded border border-zinc-800 bg-zinc-950">
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <div className="text-sm font-medium">Runs</div>
            <div className="text-xs text-zinc-400">{loading ? "Loading…" : `${runs.length} runs`}</div>
          </div>

          <div className="max-h-[70vh] overflow-auto">
            {runs.map((run) => (
              <button
                key={run.correlation_id}
                onClick={() => {
                  setSelectedCorrelationId(run.correlation_id);
                  setSelectedJobId(null);
                  setEvents([]);
                }}
                className={[
                  "w-full text-left px-3 py-2 border-b border-zinc-900 hover:bg-zinc-900/60",
                  selectedCorrelationId === run.correlation_id ? "bg-zinc-900/70" : "",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-mono truncate">{run.correlation_id.slice(0, 16)}...</div>
                  <div className="text-xs text-zinc-400">{fmt(run.last_ts)}</div>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-zinc-800 px-2 py-0.5">
                    {run.counts.queued + run.counts.running + run.counts.succeeded + run.counts.failed} jobs
                  </span>
                  {run.counts.succeeded > 0 && (
                    <span className="rounded bg-green-900/50 px-2 py-0.5 text-green-300">
                      {run.counts.succeeded} ✓
                    </span>
                  )}
                  {run.counts.failed > 0 && (
                    <span className="rounded bg-red-900/50 px-2 py-0.5 text-red-300">
                      {run.counts.failed} ✗
                    </span>
                  )}
                  {run.counts.running > 0 && (
                    <span className="rounded bg-blue-900/50 px-2 py-0.5 text-blue-300">
                      {run.counts.running} →
                    </span>
                  )}
                </div>

                {run.job_types.length > 0 && (
                  <div className="mt-1 text-xs text-zinc-400">
                    {run.job_types.slice(0, 3).join(", ")}
                    {run.job_types.length > 3 && "..."}
                  </div>
                )}
              </button>
            ))}

            {runs.length === 0 && !loading ? (
              <div className="p-6 text-sm text-zinc-400">No runs found.</div>
            ) : null}
          </div>
        </div>

        {/* Jobs for selected run */}
        <div className="lg:col-span-1 rounded border border-zinc-800 bg-zinc-950">
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <div className="text-sm font-medium">Jobs</div>
            <div className="text-xs text-zinc-400">
              {selectedRun ? `${totalJobs} total` : "Select a run"}
            </div>
          </div>

          {!selectedRun ? (
            <div className="p-6 text-sm text-zinc-400">Select a run to view jobs.</div>
          ) : jobsLoading ? (
            <div className="p-6 text-sm text-zinc-400">Loading jobs…</div>
          ) : (
            <div className="max-h-[70vh] overflow-auto">
              {jobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => {
                    setSelectedJobId(job.id);
                    fetchEvents(job.id);
                  }}
                  className={[
                    "w-full text-left px-3 py-2 border-b border-zinc-900 hover:bg-zinc-900/60",
                    selectedJobId === job.id ? "bg-zinc-900/70" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">{job.job_type}</div>
                    <div className="text-xs text-zinc-400">{fmt(job.created_at)}</div>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded bg-zinc-800 px-2 py-0.5">{job.status}</span>
                  </div>

                  {job.last_error ? (
                    <div className="mt-1 text-xs text-red-400 line-clamp-2">{job.last_error}</div>
                  ) : null}
                </button>
              ))}

              {jobs.length === 0 ? (
                <div className="p-6 text-sm text-zinc-400">No jobs found.</div>
              ) : null}
            </div>
          )}
        </div>

        {/* Job details + events */}
        <div className="lg:col-span-1 rounded border border-zinc-800 bg-zinc-950">
          <div className="p-3 border-b border-zinc-800">
            <div className="text-sm font-medium">Job Details</div>
          </div>

          {!selectedJob ? (
            <div className="p-6 text-sm text-zinc-400">Select a job to view details.</div>
          ) : (
            <div className="p-3 space-y-3">
              <div className="text-xs text-zinc-400">ID</div>
              <div className="text-xs font-mono break-all">{selectedJob.id}</div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-zinc-400">Status</div>
                  <div>{selectedJob.status}</div>
                </div>
                <div>
                  <div className="text-zinc-400">Created</div>
                  <div>{fmt(selectedJob.created_at)}</div>
                </div>
                <div>
                  <div className="text-zinc-400">Started</div>
                  <div>{fmt(selectedJob.started_at ?? null)}</div>
                </div>
                <div>
                  <div className="text-zinc-400">Finished</div>
                  <div>{fmt(selectedJob.finished_at ?? null)}</div>
                </div>
              </div>

              {selectedJob.last_error ? (
                <div className="rounded border border-red-900 bg-red-950/30 p-2 text-xs text-red-300 whitespace-pre-wrap">
                  {selectedJob.last_error}
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
                  {JSON.stringify(selectedJob.payload ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

