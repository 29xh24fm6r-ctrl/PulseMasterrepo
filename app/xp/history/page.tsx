"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Zap,
  TrendingUp,
  Calendar,
  Filter,
  ChevronRight,
  Sparkles,
  Flame,
  Target,
  Users,
  Brain,
  Cog,
  RefreshCw,
  Star,
} from "lucide-react";

interface XPEntry {
  id: string;
  name: string;
  amount: number;
  category: "DXP" | "PXP" | "IXP" | "AXP" | "MXP";
  activity: string;
  date: string;
  wasCrit: boolean;
  notes?: string;
  identityBonus?: boolean;
}

interface XPSummary {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byCategory: Record<string, number>;
  critCount: number;
  identityBonusCount: number;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: any; gradient: string }> = {
  DXP: { label: "Deal XP", color: "#3b82f6", icon: Target, gradient: "from-blue-500 to-cyan-500" },
  PXP: { label: "People XP", color: "#ec4899", icon: Users, gradient: "from-pink-500 to-rose-500" },
  IXP: { label: "Inner XP", color: "#8b5cf6", icon: Brain, gradient: "from-violet-500 to-purple-500" },
  AXP: { label: "Auto XP", color: "#f59e0b", icon: Cog, gradient: "from-amber-500 to-orange-500" },
  MXP: { label: "Maint XP", color: "#10b981", icon: RefreshCw, gradient: "from-emerald-500 to-green-500" },
};

export default function XPHistoryPage() {
  const [entries, setEntries] = useState<XPEntry[]>([]);
  const [summary, setSummary] = useState<XPSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"all" | "today" | "week" | "month">("all");

  useEffect(() => {
    fetchHistory();
  }, [filter]);

  async function fetchHistory() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (filter) params.set("category", filter);

      const res = await fetch(`/api/xp/history?${params}`);
      const data = await res.json();

      if (data.ok) {
        setEntries(data.entries || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error("Failed to fetch XP history:", err);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString("en-US", { weekday: "long" });
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  }

  function groupEntriesByDate(entries: XPEntry[]): Record<string, XPEntry[]> {
    const groups: Record<string, XPEntry[]> = {};

    for (const entry of entries) {
      const date = new Date(entry.date);
      const key = date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    }

    return groups;
  }

  function filterByTimeRange(entries: XPEntry[]): XPEntry[] {
    if (timeRange === "all") return entries;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return entries.filter((entry) => {
      const date = new Date(entry.date);
      if (timeRange === "today") return date >= todayStart;
      if (timeRange === "week") return date >= weekStart;
      if (timeRange === "month") return date >= monthStart;
      return true;
    });
  }

  const filteredEntries = filterByTimeRange(entries);
  const groupedEntries = groupEntriesByDate(filteredEntries);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-zinc-400">Loading XP history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-[128px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/xp"
              className="text-zinc-500 hover:text-zinc-300 text-sm flex items-center gap-1 mb-2"
            >
              ← XP Overview
            </Link>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
              XP History
            </h1>
            <p className="text-zinc-500 mt-1">Your journey of growth</p>
          </div>
          <button
            onClick={fetchHistory}
            className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50"
          >
            <RefreshCw className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-zinc-900/80 rounded-xl border border-zinc-800/50 p-4">
              <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Today</div>
              <div className="text-2xl font-bold text-amber-400">+{summary.today}</div>
            </div>
            <div className="bg-zinc-900/80 rounded-xl border border-zinc-800/50 p-4">
              <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">This Week</div>
              <div className="text-2xl font-bold text-white">+{summary.thisWeek}</div>
            </div>
            <div className="bg-zinc-900/80 rounded-xl border border-zinc-800/50 p-4">
              <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">This Month</div>
              <div className="text-2xl font-bold text-white">+{summary.thisMonth}</div>
            </div>
            <div className="bg-zinc-900/80 rounded-xl border border-zinc-800/50 p-4">
              <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Total</div>
              <div className="text-2xl font-bold text-white">{summary.total.toLocaleString()}</div>
            </div>
          </div>
        )}

        {/* Category Breakdown */}
        {summary && (
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800/50 p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              XP by Category
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(CATEGORY_CONFIG).map(([cat, config]) => {
                const amount = summary.byCategory[cat] || 0;
                const percentage = summary.total > 0 ? (amount / summary.total) * 100 : 0;
                const Icon = config.icon;

                return (
                  <button
                    key={cat}
                    onClick={() => setFilter(filter === cat ? null : cat)}
                    className={`
                      p-4 rounded-xl border text-left transition-all
                      ${filter === cat
                        ? `bg-gradient-to-br ${config.gradient} border-transparent`
                        : "bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600"
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4" style={{ color: filter === cat ? "white" : config.color }} />
                      <span className={`text-xs font-medium ${filter === cat ? "text-white" : "text-zinc-400"}`}>
                        {cat}
                      </span>
                    </div>
                    <div className={`text-xl font-bold ${filter === cat ? "text-white" : ""}`}>
                      {amount.toLocaleString()}
                    </div>
                    <div className={`text-xs ${filter === cat ? "text-white/70" : "text-zinc-500"}`}>
                      {percentage.toFixed(1)}%
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-500">Time Range:</span>
            {(["all", "today", "week", "month"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`
                  px-3 py-1 text-sm rounded-lg transition-colors
                  ${timeRange === range
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                  }
                `}
              >
                {range === "all" ? "All" : range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>

          {/* Stats badges */}
          {summary && (
            <div className="flex items-center gap-3 text-sm">
              {summary.critCount > 0 && (
                <div className="flex items-center gap-1 text-yellow-400">
                  <Flame className="w-4 h-4" />
                  {summary.critCount} crits
                </div>
              )}
              {summary.identityBonusCount > 0 && (
                <div className="flex items-center gap-1 text-violet-400">
                  <Sparkles className="w-4 h-4" />
                  {summary.identityBonusCount} identity bonuses
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="space-y-6">
          {Object.entries(groupedEntries).map(([date, dayEntries]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-4 h-4 text-zinc-500" />
                <h3 className="text-sm font-medium text-zinc-400">{date}</h3>
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-sm text-zinc-500">
                  +{dayEntries.reduce((sum, e) => sum + e.amount, 0)} XP
                </span>
              </div>

              <div className="space-y-2 pl-7">
                {dayEntries.map((entry) => {
                  const config = CATEGORY_CONFIG[entry.category];
                  const Icon = config?.icon || Zap;

                  return (
                    <div
                      key={entry.id}
                      className={`
                        flex items-center gap-4 p-3 rounded-xl border transition-colors
                        ${entry.wasCrit
                          ? "bg-yellow-500/10 border-yellow-500/30"
                          : entry.identityBonus
                          ? "bg-violet-500/10 border-violet-500/30"
                          : "bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700"
                        }
                      `}
                    >
                      {/* Category icon */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${config?.color}20` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: config?.color }} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{entry.name}</span>
                          {entry.wasCrit && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full flex items-center gap-0.5">
                              <Flame className="w-2.5 h-2.5" />
                              CRIT
                            </span>
                          )}
                          {entry.identityBonus && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-violet-500/20 text-violet-400 rounded-full flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5" />
                              Identity
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {formatDate(entry.date)}
                          {entry.notes && (
                            <span className="ml-2 text-zinc-600">• {entry.notes}</span>
                          )}
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right">
                        <div
                          className={`text-lg font-bold ${
                            entry.wasCrit ? "text-yellow-400" : ""
                          }`}
                          style={{ color: entry.wasCrit ? undefined : config?.color }}
                        >
                          +{entry.amount}
                        </div>
                        <div className="text-xs text-zinc-500">{entry.category}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredEntries.length === 0 && (
            <div className="text-center py-12">
              <Star className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500">No XP entries found</p>
              <p className="text-zinc-600 text-sm mt-1">Complete tasks, habits, and journal entries to earn XP</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <Link
            href="/xp"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300"
          >
            Back to XP Overview
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
