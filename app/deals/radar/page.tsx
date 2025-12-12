// Deal Radar Page
// app/deals/radar/page.tsx

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Radar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  ArrowRight,
  Sparkles,
  MessageSquare,
  X,
  Copy,
} from "lucide-react";
import { DealRadarItem } from "@/lib/deals/types";

export default function DealRadarPage() {
  const [items, setItems] = useState<DealRadarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<string | null>(null);
  const [nextAction, setNextAction] = useState<any | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    loadRadar();
  }, []);

  async function loadRadar() {
    try {
      const res = await fetch("/api/deals/radar?limit=20");
      const json = await res.json();
      if (res.ok) {
        setItems(json);
      }
    } catch (err) {
      console.error("Failed to load radar:", err);
    } finally {
      setLoading(false);
    }
  }

  async function generateNextAction(dealId: string) {
    setLoadingAction(true);
    setSelectedDeal(dealId);
    try {
      const res = await fetch(`/api/deals/${dealId}/next-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (res.ok) {
        setNextAction(json);
      }
    } catch (err) {
      console.error("Failed to generate next action:", err);
    } finally {
      setLoadingAction(false);
    }
  }

  function getRiskColor(risk: string) {
    switch (risk) {
      case "high":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "low":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      default:
        return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    }
  }

  function getPriorityColor(priority?: string | null) {
    switch (priority) {
      case "critical":
        return "bg-red-500/20 text-red-400";
      case "high":
        return "bg-orange-500/20 text-orange-400";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400";
      case "low":
        return "bg-blue-500/20 text-blue-400";
      default:
        return "bg-zinc-500/20 text-zinc-400";
    }
  }

  function getChannelIcon(channel: string) {
    switch (channel) {
      case "email":
        return "📧";
      case "sms":
        return "💬";
      case "call":
        return "📞";
      default:
        return "💬";
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading deal radar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radar className="w-8 h-8 text-violet-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Deal Radar</h1>
              <p className="text-sm text-zinc-400">
                Deals that need your attention today
              </p>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="text-sm text-zinc-400 mb-1">Total Deals</div>
            <div className="text-2xl font-bold text-white">{items.length}</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="text-sm text-zinc-400 mb-1">High Risk</div>
            <div className="text-2xl font-bold text-red-400">
              {items.filter((i) => i.riskLabel === "high").length}
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="text-sm text-zinc-400 mb-1">Open Tasks</div>
            <div className="text-2xl font-bold text-blue-400">
              {items.reduce((sum, i) => sum + i.openTasksCount, 0)}
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="text-sm text-zinc-400 mb-1">Total Value</div>
            <div className="text-2xl font-bold text-green-400">
              ${items.reduce((sum, i) => sum + (i.value || 0), 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Deal List */}
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 text-center text-zinc-400">
              No deals need attention right now. Great job! 🎉
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.dealId}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Deal Header */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-xl font-semibold text-white">{item.name}</h2>
                      {item.priority && (
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(
                            item.priority
                          )}`}
                        >
                          {item.priority}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-xs border ${getRiskColor(
                          item.riskLabel
                        )}`}
                      >
                        {item.riskLabel} risk
                      </span>
                      {item.stage && (
                        <span className="px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-300">
                          {item.stage}
                        </span>
                      )}
                    </div>

                    {/* Metrics */}
                    <div className="flex items-center gap-6 text-sm flex-wrap">
                      {item.value && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-zinc-400" />
                          <span className="text-zinc-300">
                            ${item.value.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {item.daysSinceLastComm !== null && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-zinc-400" />
                          <span className="text-zinc-300">
                            Last touch: {item.daysSinceLastComm} days ago
                          </span>
                        </div>
                      )}
                      {item.openTasksCount > 0 && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-zinc-400" />
                          <span className="text-zinc-300">
                            {item.openTasksCount} open task{item.openTasksCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                      {item.momentumScore !== null && (
                        <div className="flex items-center gap-2">
                          {item.momentumScore >= 0.5 ? (
                            <TrendingUp className="w-4 h-4 text-green-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          )}
                          <span className="text-zinc-300">
                            Momentum: {Math.round(item.momentumScore * 100)}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Risk Summary */}
                    {item.recentRiskSummary && (
                      <div className="text-sm text-zinc-400 italic">
                        {item.recentRiskSummary.substring(0, 150)}
                        {item.recentRiskSummary.length > 150 ? "..." : ""}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/deals/${item.dealId}/cockpit`}
                      className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded text-sm transition-colors flex items-center gap-1"
                    >
                      Open Cockpit
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                    <button
                      onClick={() => generateNextAction(item.dealId)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Next Action
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Next Action Side Panel */}
      {selectedDeal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Next Best Action</h2>
              <button
                onClick={() => {
                  setSelectedDeal(null);
                  setNextAction(null);
                }}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingAction ? (
              <div className="text-center text-zinc-400 py-8">Generating action...</div>
            ) : nextAction ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-zinc-400 mb-1">Target</div>
                  <div className="text-sm text-white">
                    {nextAction.targetContactName || "Unknown"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400 mb-1">Channel</div>
                  <span className="px-2 py-1 bg-violet-600/20 text-violet-400 rounded text-sm capitalize flex items-center gap-1 w-fit">
                    {getChannelIcon(nextAction.suggestedChannel)}
                    {nextAction.suggestedChannel}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-zinc-400 mb-1">Summary</div>
                  <p className="text-sm text-white">{nextAction.actionSummary}</p>
                </div>
                <div>
                  <div className="text-xs text-zinc-400 mb-1">Suggested Message</div>
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-300 whitespace-pre-wrap">
                    {nextAction.suggestedMessage}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(nextAction.suggestedMessage);
                      alert("Message copied!");
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copy Message
                  </button>
                  {nextAction.targetContactId && (
                    <Link
                      href={`/contacts/${nextAction.targetContactId}/cockpit`}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors flex items-center gap-1"
                    >
                      View Contact
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
                <div className="text-xs text-zinc-500">{nextAction.rationale}</div>
              </div>
            ) : (
              <div className="text-center text-zinc-400 py-8">
                Failed to generate action. Please try again.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
