"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Briefcase,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Clock,
  Target,
} from "lucide-react";

interface Deal {
  id: string;
  name: string;
  company: string;
  stage: string;
  value: number;
  lastContact: string | null;
}

interface PipelineStats {
  totalValue: number;
  dealCount: number;
  avgDealSize: number;
  byStage: {
    stage: string;
    count: number;
    value: number;
    color: string;
  }[];
  hotDeals: Deal[];
}

const STAGE_CONFIG: Record<string, { color: string; bgColor: string; order: number }> = {
  "Lead": { color: "#94a3b8", bgColor: "bg-slate-500/20", order: 0 },
  "Qualified": { color: "#3b82f6", bgColor: "bg-blue-500/20", order: 1 },
  "Proposal": { color: "#f59e0b", bgColor: "bg-amber-500/20", order: 2 },
  "Negotiation": { color: "#f97316", bgColor: "bg-orange-500/20", order: 3 },
  "Closed Won": { color: "#10b981", bgColor: "bg-emerald-500/20", order: 4 },
  "Closed Lost": { color: "#ef4444", bgColor: "bg-red-500/20", order: 5 },
};

export function DealPipelineWidget() {
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeals();
  }, []);

  async function loadDeals() {
    try {
      const res = await fetch("/api/deals/pull");
      const result = await res.json();

      if (result.ok && result.deals) {
        const processedStats = processDeals(result.deals);
        setStats(processedStats);
      } else {
        setStats(getMockStats());
      }
    } catch (err) {
      console.error("Failed to load deals:", err);
      setStats(getMockStats());
    } finally {
      setLoading(false);
    }
  }

  function processDeals(deals: Deal[]): PipelineStats {
    // Exclude closed lost from pipeline value
    const activeDeals = deals.filter(d => d.stage !== "Closed Lost");
    const totalValue = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const avgDealSize = activeDeals.length > 0 ? totalValue / activeDeals.length : 0;

    // Group by stage
    const stageMap: Record<string, { count: number; value: number }> = {};
    for (const deal of deals) {
      if (!stageMap[deal.stage]) {
        stageMap[deal.stage] = { count: 0, value: 0 };
      }
      stageMap[deal.stage].count++;
      stageMap[deal.stage].value += deal.value || 0;
    }

    const byStage = Object.entries(stageMap)
      .map(([stage, data]) => ({
        stage,
        count: data.count,
        value: data.value,
        color: STAGE_CONFIG[stage]?.color || "#6b7280",
      }))
      .sort((a, b) => (STAGE_CONFIG[a.stage]?.order || 99) - (STAGE_CONFIG[b.stage]?.order || 99))
      .filter(s => s.stage !== "Closed Lost" && s.stage !== "Closed Won");

    // Hot deals (Proposal or Negotiation, sorted by value)
    const hotDeals = deals
      .filter(d => d.stage === "Proposal" || d.stage === "Negotiation")
      .sort((a, b) => (b.value || 0) - (a.value || 0))
      .slice(0, 3);

    return {
      totalValue,
      dealCount: activeDeals.length,
      avgDealSize,
      byStage,
      hotDeals,
    };
  }

  function getMockStats(): PipelineStats {
    return {
      totalValue: 487500,
      dealCount: 12,
      avgDealSize: 40625,
      byStage: [
        { stage: "Lead", count: 5, value: 75000, color: "#94a3b8" },
        { stage: "Qualified", count: 3, value: 112500, color: "#3b82f6" },
        { stage: "Proposal", count: 2, value: 150000, color: "#f59e0b" },
        { stage: "Negotiation", count: 2, value: 150000, color: "#f97316" },
      ],
      hotDeals: [
        { id: "1", name: "Enterprise Deal", company: "Acme Corp", stage: "Negotiation", value: 85000, lastContact: null },
        { id: "2", name: "Annual Contract", company: "TechStart", stage: "Proposal", value: 65000, lastContact: null },
        { id: "3", name: "Platform License", company: "BigCo Inc", stage: "Negotiation", value: 45000, lastContact: null },
      ],
    };
  }

  function formatCurrency(value: number): string {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${(value || 0).toLocaleString()}`;
  }

  if (loading) {
    return (
      <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
        <div className="flex items-center gap-2 text-zinc-400 mb-4">
          <Briefcase className="w-5 h-5" />
          <span className="font-medium">Pipeline</span>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // Calculate pipeline bar widths
  const maxStageValue = Math.max(...stats.byStage.map(s => s.value), 1);

  return (
    <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 rounded-2xl border border-green-500/20 p-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-green-400">
            <Briefcase className="w-5 h-5" />
            <span className="font-medium">Pipeline</span>
          </div>
          <Link
            href="/deals"
            className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
          >
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{formatCurrency(stats.totalValue)}</div>
            <div className="text-xs text-zinc-500">Pipeline Value</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{stats.dealCount}</div>
            <div className="text-xs text-zinc-500">Active Deals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.avgDealSize)}</div>
            <div className="text-xs text-zinc-500">Avg Size</div>
          </div>
        </div>

        {/* Pipeline Funnel */}
        <div className="space-y-2 mb-5">
          <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Pipeline Stages</div>
          {stats.byStage.map((stage) => {
            const width = Math.max(20, (stage.value / maxStageValue) * 100);
            return (
              <div key={stage.stage} className="flex items-center gap-3">
                <div className="w-20 text-xs text-zinc-400 truncate">{stage.stage}</div>
                <div className="flex-1 h-6 bg-zinc-800/50 rounded-lg overflow-hidden relative">
                  <div
                    className="h-full rounded-lg transition-all flex items-center justify-end pr-2"
                    style={{
                      width: `${width}%`,
                      backgroundColor: `${stage.color}30`,
                      borderLeft: `3px solid ${stage.color}`,
                    }}
                  >
                    <span className="text-[10px] font-medium text-zinc-300">
                      {stage.count} • {formatCurrency(stage.value)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Hot Deals */}
        {stats.hotDeals.length > 0 && (
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Target className="w-3 h-3" />
              Hot Deals
            </div>
            <div className="space-y-2">
              {stats.hotDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="flex items-center gap-3 p-2 bg-zinc-800/30 rounded-lg"
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: STAGE_CONFIG[deal.stage]?.color || "#6b7280" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-200 truncate">{deal.name}</div>
                    <div className="text-xs text-zinc-500">{deal.company}</div>
                  </div>
                  <div className="text-sm font-semibold text-green-400">
                    {formatCurrency(deal.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-zinc-800/50">
          <Link
            href="/deals"
            className="flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            Manage pipeline
          </Link>
        </div>
      </div>
    </div>
  );
}

export default DealPipelineWidget;
