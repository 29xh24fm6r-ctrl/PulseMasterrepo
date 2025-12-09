"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ============================================
// TYPES
// ============================================

type InsightType = 
  | "overdue_tasks" 
  | "streak_risk" 
  | "cold_relationship" 
  | "stale_deal" 
  | "celebration" 
  | "momentum"
  | "xp_milestone"
  | "crit_window";

type Priority = "high" | "medium" | "low";

interface InsightAction {
  label: string;
  type: "navigate" | "log_habit" | "create_follow_up" | "create_task" | "dismiss";
  payload?: Record<string, any>;
}

interface Insight {
  id?: string;
  type: InsightType;
  priority: Priority;
  icon: string;
  title: string;
  message: string;
  action?: InsightAction;
  data?: Record<string, any>;
  timestamp?: string;
  handled?: boolean;
}

type FilterType = "all" | "tasks" | "habits" | "deals" | "relationships" | "xp" | "celebrations";

// ============================================
// CONSTANTS
// ============================================

const FILTER_OPTIONS: { value: FilterType; label: string; icon: string }[] = [
  { value: "all", label: "All", icon: "📋" },
  { value: "tasks", label: "Tasks", icon: "✅" },
  { value: "habits", label: "Habits", icon: "🔥" },
  { value: "deals", label: "Deals", icon: "💰" },
  { value: "relationships", label: "Relationships", icon: "👤" },
  { value: "xp", label: "XP", icon: "⚔️" },
  { value: "celebrations", label: "Celebrations", icon: "🎉" },
];

const TYPE_TO_FILTER: Record<InsightType, FilterType> = {
  overdue_tasks: "tasks",
  streak_risk: "habits",
  cold_relationship: "relationships",
  stale_deal: "deals",
  celebration: "celebrations",
  momentum: "celebrations",
  xp_milestone: "xp",
  crit_window: "xp",
};

const PRIORITY_STYLES: Record<Priority, string> = {
  high: "border-red-500/50 bg-red-900/20",
  medium: "border-yellow-500/50 bg-yellow-900/20",
  low: "border-green-500/50 bg-green-900/20",
};

const PRIORITY_BADGES: Record<Priority, { label: string; className: string }> = {
  high: { label: "Urgent", className: "bg-red-500/20 text-red-400 border-red-500/30" },
  medium: { label: "Important", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  low: { label: "Info", className: "bg-green-500/20 text-green-400 border-green-500/30" },
};

// ============================================
// COMPONENT
// ============================================

export default function NotificationsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showHandled, setShowHandled] = useState(false);
  const [handledIds, setHandledIds] = useState<Set<string>>(new Set());
  const [lastScan, setLastScan] = useState<string | null>(null);

  // Fetch insights from proactive API
  const fetchInsights = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/pulse/proactive");
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch insights");
      }

      // Add unique IDs and timestamps to insights
      const insightsWithIds = data.insights.map((insight: Insight, index: number) => ({
        ...insight,
        id: `${insight.type}-${index}-${Date.now()}`,
        timestamp: data.scannedAt,
        handled: false,
      }));

      setInsights(insightsWithIds);
      setLastScan(data.scannedAt);
    } catch (err: any) {
      console.error("Fetch insights error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // Mark insight as handled
  function handleMarkHandled(insightId: string) {
    setHandledIds((prev) => new Set([...prev, insightId]));
  }

  // Handle action click
  async function handleAction(insight: Insight) {
    if (!insight.action) return;

    const { type, payload } = insight.action;

    switch (type) {
      case "navigate":
        if (payload?.page) {
          window.location.href = `/${payload.page}`;
        }
        break;

      case "log_habit":
        // TODO: Open habit log modal or navigate
        if (payload?.habit_name) {
          alert(`Log habit: ${payload.habit_name}`);
          // In real implementation: call /api/habits/log
        }
        break;

      case "create_follow_up":
        // TODO: Open follow-up creation modal
        if (payload?.person) {
          alert(`Create follow-up for: ${payload.person}`);
          // In real implementation: navigate to follow-ups page
        }
        break;

      case "create_task":
        // TODO: Open task creation modal
        alert("Create task");
        break;

      case "dismiss":
        handleMarkHandled(insight.id!);
        break;
    }
  }

  // Filter insights
  const filteredInsights = insights.filter((insight) => {
    // Filter by handled status
    if (!showHandled && handledIds.has(insight.id!)) {
      return false;
    }

    // Filter by type
    if (filter !== "all") {
      const insightFilter = TYPE_TO_FILTER[insight.type];
      if (insightFilter !== filter) {
        return false;
      }
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = insight.title.toLowerCase().includes(query);
      const matchesMessage = insight.message.toLowerCase().includes(query);
      if (!matchesTitle && !matchesMessage) {
        return false;
      }
    }

    return true;
  });

  // Group by priority
  const highPriority = filteredInsights.filter((i) => i.priority === "high");
  const mediumPriority = filteredInsights.filter((i) => i.priority === "medium");
  const lowPriority = filteredInsights.filter((i) => i.priority === "low");

  // Count by type for filter badges
  const countByFilter: Record<FilterType, number> = {
    all: insights.filter((i) => !handledIds.has(i.id!)).length,
    tasks: insights.filter((i) => TYPE_TO_FILTER[i.type] === "tasks" && !handledIds.has(i.id!)).length,
    habits: insights.filter((i) => TYPE_TO_FILTER[i.type] === "habits" && !handledIds.has(i.id!)).length,
    deals: insights.filter((i) => TYPE_TO_FILTER[i.type] === "deals" && !handledIds.has(i.id!)).length,
    relationships: insights.filter((i) => TYPE_TO_FILTER[i.type] === "relationships" && !handledIds.has(i.id!)).length,
    xp: insights.filter((i) => TYPE_TO_FILTER[i.type] === "xp" && !handledIds.has(i.id!)).length,
    celebrations: insights.filter((i) => TYPE_TO_FILTER[i.type] === "celebrations" && !handledIds.has(i.id!)).length,
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <span className="text-3xl">🔔</span> Pulse Notifications
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Your command center for proactive insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchInsights}
            disabled={loading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-spin">⟳</span>
            ) : (
              <span>🔄</span>
            )}
            Refresh
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm"
          >
            🏠 Dashboard
          </Link>
        </div>
      </header>

      {/* Stats Bar */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3">
          <div className="text-xs text-red-400 uppercase">Urgent</div>
          <div className="text-2xl font-bold text-red-300">{highPriority.length}</div>
        </div>
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-3">
          <div className="text-xs text-yellow-400 uppercase">Important</div>
          <div className="text-2xl font-bold text-yellow-300">{mediumPriority.length}</div>
        </div>
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-3">
          <div className="text-xs text-green-400 uppercase">Info</div>
          <div className="text-2xl font-bold text-green-300">{lowPriority.length}</div>
        </div>
        <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-3">
          <div className="text-xs text-slate-400 uppercase">Last Scan</div>
          <div className="text-sm font-medium text-slate-300">
            {lastScan ? new Date(lastScan).toLocaleTimeString() : "—"}
          </div>
        </div>
      </section>

      {/* Filters & Search */}
      <section className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Filter Pills */}
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-all ${
                filter === option.value
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
              {countByFilter[option.value] > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded text-xs ${
                    filter === option.value
                      ? "bg-indigo-500 text-white"
                      : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {countByFilter[option.value]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search & Toggle */}
        <div className="flex gap-3 ml-auto">
          <input
            type="text"
            placeholder="Search insights..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm w-48 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => setShowHandled(!showHandled)}
            className={`px-3 py-2 rounded-xl text-sm ${
              showHandled
                ? "bg-slate-600 text-slate-200"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {showHandled ? "👁️ Showing handled" : "👁️‍🗨️ Hide handled"}
          </button>
        </div>
      </section>

      {/* Error State */}
      {error && (
        <section className="bg-red-900/20 border border-red-500/30 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 text-red-400">
            <span>❌</span>
            <span>{error}</span>
          </div>
          <button
            onClick={fetchInsights}
            className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
          >
            Try again
          </button>
        </section>
      )}

      {/* Loading State */}
      {loading && (
        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="text-4xl animate-pulse mb-3">🔍</div>
          <div className="text-slate-400">Scanning for insights...</div>
        </section>
      )}

      {/* Empty State */}
      {!loading && filteredInsights.length === 0 && (
        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">✨</div>
          <div className="text-xl font-semibold text-slate-200 mb-2">All clear!</div>
          <div className="text-slate-400">
            {filter !== "all"
              ? `No ${filter} insights right now.`
              : searchQuery
              ? "No insights match your search."
              : "Pulse has nothing to report. You're on top of things!"}
          </div>
        </section>
      )}

      {/* Insights List */}
      {!loading && filteredInsights.length > 0 && (
        <section className="space-y-4">
          {/* High Priority Section */}
          {highPriority.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase text-red-400 mb-3 flex items-center gap-2">
                <span>🔴</span> Urgent
              </h2>
              <div className="space-y-3">
                {highPriority.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    isHandled={handledIds.has(insight.id!)}
                    onAction={() => handleAction(insight)}
                    onMarkHandled={() => handleMarkHandled(insight.id!)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Medium Priority Section */}
          {mediumPriority.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase text-yellow-400 mb-3 flex items-center gap-2">
                <span>🟡</span> Important
              </h2>
              <div className="space-y-3">
                {mediumPriority.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    isHandled={handledIds.has(insight.id!)}
                    onAction={() => handleAction(insight)}
                    onMarkHandled={() => handleMarkHandled(insight.id!)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Low Priority Section */}
          {lowPriority.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase text-green-400 mb-3 flex items-center gap-2">
                <span>🟢</span> Info & Celebrations
              </h2>
              <div className="space-y-3">
                {lowPriority.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    isHandled={handledIds.has(insight.id!)}
                    onAction={() => handleAction(insight)}
                    onMarkHandled={() => handleMarkHandled(insight.id!)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Footer */}
      <footer className="mt-8 pt-6 border-t border-slate-800 text-center text-sm text-slate-500">
        Pulse scans your tasks, habits, deals, and relationships to surface what matters.
      </footer>
    </main>
  );
}

// ============================================
// INSIGHT CARD COMPONENT
// ============================================

interface InsightCardProps {
  insight: Insight;
  isHandled: boolean;
  onAction: () => void;
  onMarkHandled: () => void;
}

function InsightCard({ insight, isHandled, onAction, onMarkHandled }: InsightCardProps) {
  const priorityStyle = PRIORITY_STYLES[insight.priority];
  const priorityBadge = PRIORITY_BADGES[insight.priority];

  return (
    <div
      className={`p-4 rounded-xl border transition-all ${priorityStyle} ${
        isHandled ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="text-3xl flex-shrink-0">{insight.icon}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-slate-100">{insight.title}</h3>
            <span
              className={`px-2 py-0.5 rounded text-xs border ${priorityBadge.className}`}
            >
              {priorityBadge.label}
            </span>
            {isHandled && (
              <span className="px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-400">
                ✓ Handled
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mb-3">{insight.message}</p>

          {/* Data Preview */}
          {insight.data && (
            <div className="text-xs text-slate-500 mb-3 bg-slate-800/50 p-2 rounded">
              {insight.type === "overdue_tasks" && insight.data.tasks && (
                <div>
                  {insight.data.tasks.slice(0, 3).map((task: any, i: number) => (
                    <div key={i} className="truncate">
                      • {task.name} (due: {task.dueDate})
                    </div>
                  ))}
                  {insight.data.tasks.length > 3 && (
                    <div className="text-slate-600">
                      +{insight.data.tasks.length - 3} more
                    </div>
                  )}
                </div>
              )}
              {insight.type === "streak_risk" && (
                <div>
                  🔥 {insight.data.streak} day streak for {insight.data.habit}
                </div>
              )}
              {insight.type === "cold_relationship" && insight.data.contact && (
                <div>
                  {insight.data.contact.company && (
                    <span>Company: {insight.data.contact.company} • </span>
                  )}
                  {insight.data.totalCold > 1 && (
                    <span>{insight.data.totalCold} total cold contacts</span>
                  )}
                </div>
              )}
              {insight.type === "stale_deal" && insight.data.deal && (
                <div>
                  Stage: {insight.data.deal.stage}
                  {insight.data.deal.value && (
                    <span> • Value: ${insight.data.deal.value.toLocaleString()}</span>
                  )}
                  {insight.data.totalStale > 1 && (
                    <span> • {insight.data.totalStale} stale deals total</span>
                  )}
                </div>
              )}
              {insight.type === "momentum" && (
                <div>📈 {insight.data.completedToday} tasks completed today</div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {insight.action && !isHandled && (
              <button
                onClick={onAction}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
              >
                {insight.action.label}
              </button>
            )}
            {!isHandled && (
              <button
                onClick={onMarkHandled}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
              >
                ✓ Mark handled
              </button>
            )}
          </div>
        </div>

        {/* Timestamp */}
        {insight.timestamp && (
          <div className="text-xs text-slate-600 flex-shrink-0">
            {new Date(insight.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>
    </div>
  );
}
