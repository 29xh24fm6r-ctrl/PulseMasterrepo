"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface Insight {
  type: string;
  priority: "high" | "medium" | "low";
  icon: string;
  title: string;
  message: string;
}

interface PulseNotificationsWidgetProps {
  variant?: "full" | "compact" | "mini";
  maxItems?: number;
}

export default function PulseNotificationsWidget({
  variant = "compact",
  maxItems = 3,
}: PulseNotificationsWidgetProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInsights();
  }, []);

  async function fetchInsights() {
    try {
      setLoading(true);
      const res = await fetch("/api/pulse/proactive");
      const data = await res.json();

      if (data.success) {
        setInsights(data.insights || []);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const highPriority = insights.filter((i) => i.priority === "high");
  const mediumPriority = insights.filter((i) => i.priority === "medium");
  const totalUrgent = highPriority.length;
  const totalImportant = mediumPriority.length;

  // Mini variant - just a badge
  if (variant === "mini") {
    const hasUrgent = totalUrgent > 0;
    const hasAny = insights.length > 0;

    return (
      <Link href="/notifications" className="relative">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            hasUrgent
              ? "bg-red-500/20 border border-red-500/50 animate-pulse"
              : hasAny
              ? "bg-yellow-500/20 border border-yellow-500/50"
              : "bg-slate-800 border border-slate-700"
          }`}
        >
          <span className="text-lg">🔔</span>
        </div>
        {hasAny && (
          <span
            className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
              hasUrgent ? "bg-red-500 text-white" : "bg-yellow-500 text-black"
            }`}
          >
            {insights.length}
          </span>
        )}
      </Link>
    );
  }

  // Compact variant
  if (variant === "compact") {
    return (
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold uppercase text-slate-400 tracking-wide flex items-center gap-2">
            <span>🔔</span> Pulse Noticed
          </h3>
          <Link
            href="/notifications"
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            View all →
          </Link>
        </div>

        {loading && (
          <div className="py-4 text-center">
            <span className="text-xl animate-pulse">🔍</span>
          </div>
        )}

        {!loading && error && (
          <div className="py-4 text-center text-sm text-red-400">
            Failed to load insights
          </div>
        )}

        {!loading && !error && insights.length === 0 && (
          <div className="py-4 text-center">
            <div className="text-2xl mb-1">✨</div>
            <div className="text-sm text-slate-400">All clear!</div>
          </div>
        )}

        {!loading && !error && insights.length > 0 && (
          <>
            {/* Quick Stats */}
            <div className="flex gap-2 mb-3">
              {totalUrgent > 0 && (
                <span className="px-2 py-1 bg-red-900/30 border border-red-500/30 rounded text-xs text-red-400">
                  🔴 {totalUrgent} urgent
                </span>
              )}
              {totalImportant > 0 && (
                <span className="px-2 py-1 bg-yellow-900/30 border border-yellow-500/30 rounded text-xs text-yellow-400">
                  🟡 {totalImportant} important
                </span>
              )}
            </div>

            {/* Top Insights */}
            <div className="space-y-2">
              {insights.slice(0, maxItems).map((insight, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg border text-sm ${
                    insight.priority === "high"
                      ? "bg-red-900/20 border-red-500/30"
                      : insight.priority === "medium"
                      ? "bg-yellow-900/20 border-yellow-500/30"
                      : "bg-slate-800/50 border-slate-700"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">{insight.icon}</span>
                    <div className="min-w-0">
                      <div className="font-medium text-slate-200 truncate">
                        {insight.title}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {insight.message}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {insights.length > maxItems && (
              <Link
                href="/notifications"
                className="block mt-3 text-center text-xs text-slate-500 hover:text-slate-400"
              >
                +{insights.length - maxItems} more insights
              </Link>
            )}
          </>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          <span className="text-2xl">🔔</span> Pulse Notifications
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchInsights}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm disabled:opacity-50"
          >
            {loading ? "⟳" : "🔄"}
          </button>
          <Link
            href="/notifications"
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg"
          >
            Open →
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-red-400">{totalUrgent}</div>
          <div className="text-xs text-red-400/70">Urgent</div>
        </div>
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-yellow-400">{totalImportant}</div>
          <div className="text-xs text-yellow-400/70">Important</div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-slate-300">{insights.length}</div>
          <div className="text-xs text-slate-500">Total</div>
        </div>
      </div>

      {loading && (
        <div className="py-8 text-center">
          <span className="text-3xl animate-pulse">🔍</span>
          <div className="text-sm text-slate-400 mt-2">Scanning...</div>
        </div>
      )}

      {!loading && error && (
        <div className="py-4 text-center text-sm text-red-400 bg-red-900/20 rounded-lg">
          {error}
        </div>
      )}

      {!loading && !error && insights.length === 0 && (
        <div className="py-8 text-center">
          <div className="text-4xl mb-2">✨</div>
          <div className="text-slate-300 font-medium">You're all caught up!</div>
          <div className="text-sm text-slate-500">Pulse has nothing to report.</div>
        </div>
      )}

      {!loading && !error && insights.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {insights.slice(0, 5).map((insight, i) => (
            <div
              key={i}
              className={`p-3 rounded-xl border ${
                insight.priority === "high"
                  ? "bg-red-900/20 border-red-500/30"
                  : insight.priority === "medium"
                  ? "bg-yellow-900/20 border-yellow-500/30"
                  : "bg-green-900/20 border-green-500/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{insight.icon}</span>
                <div>
                  <div className="font-medium text-slate-200">{insight.title}</div>
                  <div className="text-sm text-slate-400">{insight.message}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
