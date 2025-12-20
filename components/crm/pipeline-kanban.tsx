"use client";

import Link from "next/link";
import { DollarSign, Users, Calendar } from "lucide-react";
import type { Deal } from "@/lib/crm/types";

interface PipelineProps {
  pipeline: {
    stages: string[];
    dealsByStage: Record<string, Deal[]>;
  };
}

const STAGE_LABELS: Record<string, string> = {
  prospecting: "Prospecting",
  qualified: "Qualified",
  proposal: "Proposal",
  underwriting: "Underwriting",
  closing: "Closing",
  won: "Won",
  lost: "Lost",
};

const STAGE_COLORS: Record<string, string> = {
  prospecting: "border-blue-500/30 bg-blue-500/10",
  qualified: "border-green-500/30 bg-green-500/10",
  proposal: "border-yellow-500/30 bg-yellow-500/10",
  underwriting: "border-purple-500/30 bg-purple-500/10",
  closing: "border-orange-500/30 bg-orange-500/10",
  won: "border-emerald-500/30 bg-emerald-500/10",
  lost: "border-red-500/30 bg-red-500/10",
};

export default function PipelineKanban({ pipeline }: PipelineProps) {
  const activeStages = pipeline.stages.filter((stage) => 
    pipeline.dealsByStage[stage] && pipeline.dealsByStage[stage].length > 0
  );

  if (activeStages.length === 0) {
    return (
      <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-12 text-center">
        <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No deals yet</h3>
        <p className="text-gray-400 mb-4">Create your first deal to start tracking opportunities</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {pipeline.stages.map((stage) => {
          const deals = pipeline.dealsByStage[stage] || [];
          const isEmpty = deals.length === 0;
          const isActive = ["won", "lost"].includes(stage) ? deals.length > 0 : true;

          if (!isActive && isEmpty) return null;

          return (
            <div
              key={stage}
              className={`flex-shrink-0 w-80 rounded-lg border p-4 ${STAGE_COLORS[stage] || "border-zinc-700"} ${isEmpty ? "opacity-50" : ""}`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{STAGE_LABELS[stage] || stage}</h3>
                <span className="text-sm text-gray-400">{deals.length}</span>
              </div>
              <div className="space-y-2">
                {deals.length > 0 ? (
                  deals.map((deal) => (
                    <DealCard key={deal.id} deal={deal} />
                  ))
                ) : (
                  <div className="text-sm text-gray-500 py-4 text-center">No deals</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DealCard({ deal }: { deal: Deal }) {
  return (
    <Link
      href={`/crm/deals/${deal.id}`}
      className="block p-3 bg-zinc-900/80 rounded border border-zinc-700 hover:border-zinc-600 transition-colors"
    >
      <div className="font-medium text-sm mb-1">{deal.name}</div>
      {deal.amount && (
        <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
          <DollarSign className="w-3 h-3" />
          ${deal.amount.toLocaleString()}
        </div>
      )}
      {deal.contact_name && (
        <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
          <Users className="w-3 h-3" />
          {deal.contact_name}
        </div>
      )}
      {deal.close_date && (
        <div className="text-xs text-gray-400 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {new Date(deal.close_date).toLocaleDateString()}
        </div>
      )}
      {deal.task_count !== undefined && deal.task_count > 0 && (
        <div className="mt-2 text-xs text-purple-400">
          {deal.task_count} task{deal.task_count !== 1 ? "s" : ""}
        </div>
      )}
    </Link>
  );
}

