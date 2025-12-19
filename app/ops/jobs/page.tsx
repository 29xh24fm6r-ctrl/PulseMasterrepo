"use client";

import { useSearchParams } from "next/navigation";
import ProviderHealthPanel from "@/components/jobs/ProviderHealthPanel";
import JobTimeline from "@/components/jobs/JobTimeline";
import ReliabilityCard from "@/components/jobs/ReliabilityCard";

export default function OpsJobsPage() {
  const searchParams = useSearchParams();
  const jobId = searchParams?.get("jobId") ?? null;

  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-lg font-semibold">Ops · Jobs</div>
        <div className="text-sm text-slate-600">
          Provider health + job event timeline
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProviderHealthPanel />
        <ReliabilityCard />
      </div>

      <JobTimeline
        jobId={jobId}
        title={jobId ? "Job Details Timeline" : "Job Timeline"}
        subtitle={jobId ? `Job ID: ${jobId}` : "Pass ?jobId=... to inspect a specific job"}
      />
    </div>
  );
}
