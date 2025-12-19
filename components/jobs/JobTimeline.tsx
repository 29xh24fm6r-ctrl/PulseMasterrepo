"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type JobEvent = {
  job_id: string;
  at: string;
  event: string;
  level?: string | null;
  message?: string | null;
  meta?: any;
};

type TimelineSummary = {
  jobId: string | null;
  status: string;
  lastEvent: JobEvent | null;
  retryDelaySeconds: number | null;
  provider: string | null;
  providerStatus: string | null; // if you embed it in meta later
};

function fmt(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString();
}

function pillClass(kind: "ok" | "warn" | "bad" | "info") {
  if (kind === "ok") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (kind === "warn") return "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (kind === "bad") return "bg-red-100 text-red-800 border-red-200";
  return "bg-slate-100 text-slate-800 border-slate-200";
}

function deriveStatus(last: JobEvent | null) {
  const ev = (last?.event ?? "unknown").toLowerCase();

  if (!last) return { label: "No activity yet", kind: "info" as const };

  if (ev.includes("completed")) return { label: "Completed", kind: "ok" as const };
  if (ev.includes("permanent_failure") || ev === "failed") return { label: "Failed", kind: "bad" as const };
  if (ev.includes("retry") || ev.includes("retry_scheduled")) return { label: "Retry scheduled", kind: "warn" as const };
  if (ev.includes("running") || ev.includes("started") || ev.includes("heartbeat")) return { label: "Running", kind: "info" as const };
  if (ev.includes("recovered_stuck")) return { label: "Recovered (stuck)", kind: "warn" as const };
  if (ev.includes("lost_lease")) return { label: "Lost lease", kind: "warn" as const };

  return { label: last.event, kind: "info" as const };
}

function groupEvents(events: JobEvent[]) {
  // Collapse repeated heartbeat/lease events into "event × N"
  const out: Array<JobEvent & { count?: number }> = [];
  let i = 0;

  const isGroupable = (e: JobEvent) => {
    const ev = (e.event || "").toLowerCase();
    return ev.includes("heartbeat") || ev.includes("lease");
  };

  while (i < events.length) {
    const cur = events[i];
    if (!isGroupable(cur)) {
      out.push(cur);
      i++;
      continue;
    }

    let j = i + 1;
    while (j < events.length && events[j].event === cur.event) j++;

    const count = j - i;
    if (count <= 1) out.push(cur);
    else out.push({ ...cur, count });

    i = j;
  }

  return out;
}

export default function JobTimeline({
  jobId,
  loading,
  title = "Job Timeline",
  subtitle,
  onSummary,
}: {
  jobId: string | null | undefined;
  loading?: boolean;
  title?: string;
  subtitle?: string;
  onSummary?: (s: TimelineSummary) => void;
}) {
  const [events, setEvents] = useState<JobEvent[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);

  const lastSummaryRef = useRef<string>("");

  const effectiveLoading = loading ?? localLoading;

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!jobId) {
        setEvents([]);
        setErr(null);

        const s: TimelineSummary = {
          jobId: null,
          status: "No processing jobs yet",
          lastEvent: null,
          retryDelaySeconds: null,
          provider: null,
          providerStatus: null,
        };

        const key = JSON.stringify(s);
        if (onSummary && key !== lastSummaryRef.current) {
          lastSummaryRef.current = key;
          onSummary(s);
        }
        return;
      }

      try {
        setLocalLoading(true);
        setErr(null);

        const r = await fetch(`/api/jobs/${jobId}/events`, { cache: "no-store" });
        const j = await r.json();

        if (!alive) return;

        if (!r.ok) {
          setEvents([]);
          setErr(j?.error ?? "Failed to load job events");
          return;
        }

        const evs: JobEvent[] = j?.events ?? [];
        setEvents(evs);

        const last = evs.length ? evs[evs.length - 1] : null;
        const provider = (last?.meta?.provider ?? null) as string | null;

        const retryDelay =
          typeof last?.meta?.delay_seconds === "number"
            ? (last.meta.delay_seconds as number)
            : typeof last?.meta?.delaySeconds === "number"
            ? (last.meta.delaySeconds as number)
            : null;

        const statusDerived = deriveStatus(last);

        const summary: TimelineSummary = {
          jobId,
          status: statusDerived.label,
          lastEvent: last,
          retryDelaySeconds: retryDelay,
          provider,
          providerStatus: (last?.meta?.provider_status ?? null) as string | null,
        };

        const key = JSON.stringify({
          jobId: summary.jobId,
          status: summary.status,
          at: summary.lastEvent?.at ?? null,
          event: summary.lastEvent?.event ?? null,
          retryDelaySeconds: summary.retryDelaySeconds,
          provider: summary.provider,
          providerStatus: summary.providerStatus,
        });

        if (onSummary && key !== lastSummaryRef.current) {
          lastSummaryRef.current = key;
          onSummary(summary);
        }
      } catch (e: any) {
        if (!alive) return;
        setEvents([]);
        setErr(e?.message ?? "Failed to load job events");
      } finally {
        if (alive) setLocalLoading(false);
      }
    }

    run();
    const id = setInterval(run, 5000);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [jobId, onSummary]);

  const grouped = useMemo(() => groupEvents(events), [events]);
  const last = events.length ? events[events.length - 1] : null;
  const status = deriveStatus(last);

  const retryHint =
    status.label.toLowerCase().includes("retry") && (last?.meta?.delay_seconds || last?.meta?.delaySeconds)
      ? `Retrying in ${last.meta.delay_seconds ?? last.meta.delaySeconds}s`
      : null;

  const providerBanner =
    (last?.meta?.provider_status === "degraded" || last?.meta?.provider_status === "outage") ? (
      <div className="mt-3 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
        Provider is <span className="font-semibold">{last.meta.provider_status}</span>. Pulse is automatically
        retrying with longer delays to protect reliability.
      </div>
    ) : null;

  const copyDebugBundle = async () => {
    if (!jobId) return;

    try {
      // Fetch provider health snapshot
      const healthRes = await fetch("/api/providers/health", { cache: "no-store" });
      const healthData = await healthRes.json();
      const providerHealth = healthData?.providers ?? [];

      // Get last error classification and retry delay from events
      const errorEvent = events
        .filter((e) => e.level === "error" || e.event === "failed" || e.event === "retry")
        .slice(-1)[0];

      const debugBundle = {
        jobId,
        events: events.slice(-50), // Last 50 events
        providerHealth,
        lastError: errorEvent
          ? {
              event: errorEvent.event,
              message: errorEvent.message,
              meta: errorEvent.meta,
              at: errorEvent.at,
              retryDelaySeconds: errorEvent.meta?.delay_seconds ?? errorEvent.meta?.delaySeconds ?? null,
            }
          : null,
        copiedAt: new Date().toISOString(),
      };

      await navigator.clipboard.writeText(JSON.stringify(debugBundle, null, 2));
      alert("Debug bundle copied to clipboard!");
    } catch (e: any) {
      console.error("Failed to copy debug bundle:", e);
      alert("Failed to copy debug bundle");
    }
  };

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-slate-500">
            {subtitle ?? (jobId ? `Job ID: ${jobId}` : "No processing jobs yet")}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`rounded-full border px-3 py-1 text-xs font-medium ${pillClass(status.kind)}`}>
            {effectiveLoading ? "Loading…" : status.label}
          </div>
          {jobId && (
            <button
              onClick={copyDebugBundle}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              title="Copy debug bundle (JSON)"
            >
              Copy Debug Bundle
            </button>
          )}
        </div>
      </div>

      {retryHint ? <div className="mt-2 text-xs text-slate-600">{retryHint}</div> : null}
      {providerBanner}

      <div className="mt-4">
        {!jobId ? (
          <div className="text-sm text-slate-500">No processing jobs yet.</div>
        ) : err ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</div>
        ) : effectiveLoading && grouped.length === 0 ? (
          <div className="text-sm text-slate-500">Loading events…</div>
        ) : grouped.length === 0 ? (
          <div className="text-sm text-slate-500">No events yet.</div>
        ) : (
          <ol className="space-y-2">
            {grouped.map((e: any, idx: number) => (
              <li key={`${e.at}-${idx}`} className="rounded-xl border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${pillClass("info")}`}>
                      {(e.level || "info").toLowerCase()}
                    </span>
                    <span className="text-sm font-medium">
                      {e.event}
                      {typeof e.count === "number" && e.count > 1 ? ` × ${e.count}` : ""}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">{fmt(e.at)}</div>
                </div>

                {e.message ? <div className="mt-1 text-sm text-slate-700">{e.message}</div> : null}

                {e.meta?.provider ? (
                  <div className="mt-2 text-xs text-slate-500">
                    Provider: <span className="font-medium text-slate-700">{e.meta.provider}</span>
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
