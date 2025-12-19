"use client";

import React, { useEffect, useState } from "react";

type Decision = {
  id: number;
  decision: string;
  reason: string;
  lane: string | null;
  queue_depth: number;
  user_budget_remaining: number | null;
  user_effective_budget: number | null;
  system_load_score: number | null;
  starvation_risk: boolean;
  sla_risk: boolean;
  created_at: string;
  meta: any;
};

type Health = {
  score: number;
  status: string;
  queue_depth: number;
  mean_wait_seconds: number | null;
  p95_wait_seconds: number | null;
  starvation_count: number;
  sla_breach_count: number;
  retry_pressure: number | null;
  warnings: string[];
  created_at: string;
};

export default function SchedulerPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const d = await fetch("/api/scheduler/me/decisions?limit=200").then((r) => r.json());
        if (d?.ok) setDecisions(d.data || []);

        const h = await fetch("/api/scheduler/health").then((r) => r.json());
        if (h?.ok) setHealth(h.data || null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-semibold">Scheduler Telemetry</div>
          <div className="text-sm text-zinc-400">
            Every lease/throttle/defer is logged so Pulse feels explainable and enterprise-grade.
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="text-lg font-semibold">Scheduler Health</div>
        {loading ? (
          <div className="text-sm opacity-70 mt-2">Loading…</div>
        ) : !health ? (
          <div className="text-sm opacity-70 mt-2">No health snapshot available</div>
        ) : (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="opacity-60">Status</div>
              <div className="font-medium">{health.status}</div>
            </div>
            <div>
              <div className="opacity-60">Score</div>
              <div className="font-medium">{health.score}</div>
            </div>
            <div>
              <div className="opacity-60">Queue Depth</div>
              <div className="font-medium">{health.queue_depth}</div>
            </div>
            <div>
              <div className="opacity-60">P95 Wait (s)</div>
              <div className="font-medium">{Math.round(health.p95_wait_seconds || 0)}</div>
            </div>
            <div>
              <div className="opacity-60">Starvation</div>
              <div className="font-medium">{health.starvation_count}</div>
            </div>
            <div>
              <div className="opacity-60">SLA Risk</div>
              <div className="font-medium">{health.sla_breach_count}</div>
            </div>
            <div>
              <div className="opacity-60">Retry Pressure</div>
              <div className="font-medium">{(health.retry_pressure || 0).toFixed(2)}</div>
            </div>
            <div>
              <div className="opacity-60">Warnings</div>
              <div className="font-medium">{health.warnings?.join(", ") || "—"}</div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="text-lg font-semibold">My Scheduler Decisions</div>
        <div className="text-sm opacity-70 mt-1">
          Every lease/throttle/defer is logged so Pulse feels explainable and enterprise-grade.
        </div>

        <div className="mt-4 space-y-2">
          {decisions.length === 0 ? (
            <div className="text-sm opacity-70">No decisions yet.</div>
          ) : (
            decisions.map((x) => (
              <div key={x.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-sm">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="font-semibold">{x.decision}</span>
                  <span className="opacity-60">{x.reason}</span>
                  {x.lane ? (
                    <span className="px-2 py-0.5 rounded bg-zinc-800">{x.lane}</span>
                  ) : null}
                  {x.starvation_risk ? (
                    <span className="px-2 py-0.5 rounded bg-yellow-900/50 text-yellow-300">
                      starvation
                    </span>
                  ) : null}
                  {x.sla_risk ? (
                    <span className="px-2 py-0.5 rounded bg-red-900/50 text-red-300">sla-risk</span>
                  ) : null}
                </div>

                <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-2 opacity-80">
                  <div>
                    queue: <b>{x.queue_depth}</b>
                  </div>
                  <div>
                    remaining: <b>{x.user_budget_remaining ?? "—"}</b>
                  </div>
                  <div>
                    effective: <b>{x.user_effective_budget ?? "—"}</b>
                  </div>
                  <div>
                    load: <b>{x.system_load_score ?? "—"}</b>
                  </div>
                  <div className="md:text-right">{new Date(x.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

