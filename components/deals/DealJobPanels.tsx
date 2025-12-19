"use client";

import React, { useMemo, useState } from "react";
import ProviderHealthPanel from "@/components/jobs/ProviderHealthPanel";
import JobTimeline from "@/components/jobs/JobTimeline";
import ReliabilityCard from "@/components/jobs/ReliabilityCard";
import { useLatestJobId } from "@/hooks/useLatestJobId";

type Summary = {
  jobId: string | null;
  status: string;
  lastEvent: any | null;
  retryDelaySeconds: number | null;
  provider: string | null;
  providerStatus: string | null;
};

function chipClass(status: string) {
  const s = (status || "").toLowerCase();
  if (s.includes("completed")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (s.includes("failed")) return "bg-red-100 text-red-800 border-red-200";
  if (s.includes("retry")) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (s.includes("running")) return "bg-slate-100 text-slate-800 border-slate-200";
  return "bg-slate-100 text-slate-800 border-slate-200";
}

export default function DealJobPanels({ dealId }: { dealId: string }) {
  const { jobId: latestJobId, loading: latestJobLoading } = useLatestJobId({
    entityType: "deal",
    entityId: dealId,
    pollMs: 5000,
  });

  const [summary, setSummary] = useState<Summary>({
    jobId: null,
    status: "No processing jobs yet",
    lastEvent: null,
    retryDelaySeconds: null,
    provider: null,
    providerStatus: null,
  });

  const opsHref = useMemo(() => {
    if (!latestJobId) return "/ops/jobs";
    return `/ops/jobs?jobId=${encodeURIComponent(latestJobId)}`;
  }, [latestJobId]);

  const subtitle = useMemo(() => {
    if (!latestJobId) return "No processing jobs yet";
    const bits: string[] = [];
    if (summary.provider) bits.push(`Provider: ${summary.provider}`);
    if (summary.retryDelaySeconds && summary.status.toLowerCase().includes("retry")) {
      bits.push(`Retrying in ${summary.retryDelaySeconds}s`);
    }
    return bits.length ? bits.join(" · ") : `Job ID: ${latestJobId}`;
  }, [latestJobId, summary.provider, summary.retryDelaySeconds, summary.status]);

  return (
    <div className="space-y-4">
      {/* Cockpit-grade header row */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-white p-4 shadow-sm">
        <div>
          <div className="text-sm font-semibold">System Processing</div>
          <div className="text-xs text-slate-500">Live execution + provider health</div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${chipClass(summary.status)}`}>
            {latestJobLoading ? "Loading…" : summary.status}
          </span>

          <a
            href={opsHref}
            className="rounded-full border px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Open Job Details
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProviderHealthPanel />
        <ReliabilityCard />
      </div>

      <JobTimeline
        jobId={latestJobId}
        loading={latestJobLoading}
        title="Deal Processing Timeline"
        subtitle={subtitle}
        onSummary={(s) =>
          setSummary({
            jobId: s.jobId,
            status: s.status,
            lastEvent: s.lastEvent,
            retryDelaySeconds: s.retryDelaySeconds,
            provider: s.provider,
            providerStatus: s.providerStatus,
          })
        }
      />
    </div>
  );
}
