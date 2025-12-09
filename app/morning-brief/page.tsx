"use client";
import { MorningBriefVoice } from "@/components/MorningBriefVoice";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sun,
  Moon,
  Cloud,
  CheckCircle2,
  Circle,
  TrendingUp,
  DollarSign,
  Target,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Zap,
} from "lucide-react";

const IDENTITY_STATE_KEY = "pulse-identity-state";

interface MorningBrief {
  greeting: string;
  date: string;
  tasks: {
    total: number;
    urgent: number;
    high: number;
    topTasks: { id: string; name: string; priority: string }[];
  };
  deals: {
    active: number;
    needsAttention: number;
    topDeals: { id: string; name: string; stage: string; value?: number }[];
  };
  habits: {
    total: number;
    completedYesterday: number;
    streak: number;
  };
  identity: {
    summary: string;
    insights: {
      type: string;
      priority: string;
      title: string;
      message: string;
      icon: string;
      actionable?: { label: string; href: string };
    }[];
    activeArchetype?: {
      name: string;
      icon: string;
      xpBonus: string;
    };
  };
  quote?: string;
  focusSuggestion?: string;
}

export default function MorningBriefPage() {
  const [brief, setBrief] = useState<MorningBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [suppressed, setSuppressed] = useState(false);
  const [suppressReason, setSuppressReason] = useState("");

  useEffect(() => {
    fetchBrief();
  }, []);

  async function fetchBrief() {
    setLoading(true);
    try {
      // Get identity state from localStorage
      let identityState = null;
      try {
        const saved = localStorage.getItem(IDENTITY_STATE_KEY);
        if (saved) identityState = JSON.parse(saved);
      } catch {}

      // Get autonomy settings
      let settings = null;
      try {
        const savedSettings = localStorage.getItem("pulse-autonomy-settings");
        if (savedSettings) settings = JSON.parse(savedSettings);
      } catch {}

      const res = await fetch("/api/morning-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings, identityState }),
      });

      const data = await res.json();

      if (data.suppressed) {
        setSuppressed(true);
        setSuppressReason(data.reason || "Autonomy settings");
      } else if (data.ok && data.brief) {
        setBrief(data.brief);
      }
    } catch (err) {
      console.error("Failed to fetch morning brief:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Sun className="w-12 h-12 text-amber-400 animate-pulse" />
          <p className="text-slate-400">Preparing your brief...</p>
        </div>
      </div>
    );
  }

  if (suppressed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center p-8">
          <Moon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-400 mb-2">Morning Brief Paused</h1>
          <p className="text-slate-500">{suppressReason}</p>
          <Link
            href="/settings/autonomy"
            className="mt-6 inline-block text-violet-400 hover:text-violet-300"
          >
            Manage Settings →
          </Link>
        </div>
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center p-8">
          <Cloud className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-400 mb-2">Could not load brief</h1>
          <button
            onClick={fetchBrief}
            className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const priorityColors: Record<string, string> = {
    Urgent: "text-red-400 bg-red-500/20",
    High: "text-orange-400 bg-orange-500/20",
    Medium: "text-yellow-400 bg-yellow-500/20",
    Low: "text-green-400 bg-green-500/20",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-400">{brief.greeting}</h1>
            <p className="text-slate-400 mt-1">{brief.date}</p>
          </div>
          <button
            onClick={fetchBrief}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        {/* Listen to Brief */}
        <div className="mb-8">
          <MorningBriefVoice />
        </div>

        {/* Focus Suggestion */}
        {brief.focusSuggestion && (
          <div className="mb-8 p-4 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 rounded-xl border border-violet-500/30">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm text-violet-300 font-medium mb-1">Today&apos;s Focus</div>
                <p className="text-white">{brief.focusSuggestion}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tasks */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Tasks
              </h2>
              <Link href="/tasks" className="text-sm text-slate-400 hover:text-white">
                View all →
              </Link>
            </div>
            
            <div className="flex gap-4 mb-4 text-sm">
              <div className="text-slate-400">
                <span className="text-white font-medium">{brief.tasks.total}</span> open
              </div>
              {brief.tasks.urgent > 0 && (
                <div className="text-red-400">
                  <span className="font-medium">{brief.tasks.urgent}</span> urgent
                </div>
              )}
              {brief.tasks.high > 0 && (
                <div className="text-orange-400">
                  <span className="font-medium">{brief.tasks.high}</span> high
                </div>
              )}
            </div>

            <div className="space-y-2">
              {brief.tasks.topTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-700/30"
                >
                  <Circle className="w-4 h-4 text-slate-500" />
                  <span className="flex-1 text-sm truncate">{task.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[task.priority] || "text-slate-400 bg-slate-600"}`}>
                    {task.priority}
                  </span>
                </div>
              ))}
              {brief.tasks.topTasks.length === 0 && (
                <p className="text-slate-500 text-sm">No open tasks</p>
              )}
            </div>
          </div>

          {/* Deals */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                Deals
              </h2>
              <Link href="/deals" className="text-sm text-slate-400 hover:text-white">
                View all →
              </Link>
            </div>

            <div className="flex gap-4 mb-4 text-sm">
              <div className="text-slate-400">
                <span className="text-white font-medium">{brief.deals.active}</span> active
              </div>
              {brief.deals.needsAttention > 0 && (
                <div className="text-amber-400">
                  <span className="font-medium">{brief.deals.needsAttention}</span> need attention
                </div>
              )}
            </div>

            <div className="space-y-2">
              {brief.deals.topDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-700/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{deal.name}</div>
                    <div className="text-xs text-slate-500">{deal.stage}</div>
                  </div>
                  {(deal.value ?? 0) > 0 && (
                    <span className="text-sm text-green-400 font-medium">
                      ${(deal.value ?? 0).toLocaleString()}
                    </span>
                  )}
                </div>
              ))}
              {brief.deals.topDeals.length === 0 && (
                <p className="text-slate-500 text-sm">No active deals</p>
              )}
            </div>
          </div>

          {/* Identity Insights - NEW SECTION */}
          <div className="md:col-span-2 bg-gradient-to-br from-violet-900/30 to-fuchsia-900/30 rounded-xl p-6 border border-violet-500/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-400" />
                Identity
              </h2>
              <Link href="/identity/dashboard" className="text-sm text-violet-400 hover:text-violet-300">
                Dashboard →
              </Link>
            </div>

            {/* Active Archetype Badge */}
            {brief.identity.activeArchetype && (
              <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/20 rounded-full border border-violet-500/30">
                <span className="text-lg">{brief.identity.activeArchetype.icon}</span>
                <span className="text-sm font-medium text-violet-300">
                  {brief.identity.activeArchetype.name}
                </span>
                <span className="text-xs text-violet-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {brief.identity.activeArchetype.xpBonus}
                </span>
              </div>
            )}

            {/* Summary */}
            <p className="text-slate-300 text-sm mb-4">{brief.identity.summary}</p>

            {/* Insights */}
            {brief.identity.insights.length > 0 && (
              <div className="space-y-3">
                {brief.identity.insights.map((insight, i) => (
                  <div
                    key={i}
                    className={`
                      p-3 rounded-lg border
                      ${insight.priority === "high" 
                        ? "bg-amber-500/10 border-amber-500/30" 
                        : insight.priority === "medium"
                        ? "bg-slate-700/30 border-slate-600/30"
                        : "bg-slate-800/30 border-slate-700/30"
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{insight.icon}</span>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{insight.title}</div>
                        <p className="text-slate-400 text-xs mt-0.5">{insight.message}</p>
                      </div>
                      {insight.actionable && (
                        <Link
                          href={insight.actionable.href}
                          className="flex-shrink-0 text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                        >
                          {insight.actionable.label}
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {brief.identity.insights.length === 0 && !brief.identity.activeArchetype && (
              <div className="text-center py-4">
                <p className="text-slate-500 text-sm mb-2">Start tracking identity actions</p>
                <Link
                  href="/identity/dashboard"
                  className="inline-flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300"
                >
                  Go to Dashboard
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quote */}
        {brief.quote && (
          <div className="mt-8 text-center">
            <p className="text-slate-400 italic text-sm">&ldquo;{brief.quote}&rdquo;</p>
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/tasks"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
          >
            Tasks
          </Link>
          <Link
            href="/deals"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
          >
            Deals
          </Link>
          <Link
            href="/journal"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
          >
            Journal
          </Link>
          <Link
            href="/identity/dashboard"
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm transition-colors"
          >
            Identity Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
