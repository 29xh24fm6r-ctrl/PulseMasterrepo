"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Brain, AlertTriangle, Flame, Users, DollarSign, Trophy,
  ChevronRight, RefreshCw, Loader2, Zap, Moon, Eye, EyeOff
} from "lucide-react";
import { useAutonomy } from "@/lib/use-autonomy";

type InsightType = "overdue_tasks" | "streak_risk" | "cold_relationship" | "stale_deal" | "celebration" | "momentum";

type Insight = {
  type: InsightType;
  title: string;
  message: string;
  priority: "high" | "medium" | "low";
  action?: {
    label: string;
    href: string;
  };
  data?: any;
};

const TYPE_CONFIG: Record<InsightType, { icon: React.ReactNode; color: string }> = {
  overdue_tasks: { icon: <AlertTriangle className="w-4 h-4" />, color: "text-red-400" },
  streak_risk: { icon: <Flame className="w-4 h-4" />, color: "text-orange-400" },
  cold_relationship: { icon: <Users className="w-4 h-4" />, color: "text-blue-400" },
  stale_deal: { icon: <DollarSign className="w-4 h-4" />, color: "text-amber-400" },
  celebration: { icon: <Trophy className="w-4 h-4" />, color: "text-green-400" },
  momentum: { icon: <Zap className="w-4 h-4" />, color: "text-purple-400" },
};

interface ProactiveInsightsWidgetProps {
  maxInsights?: number;
}

export function ProactiveInsightsWidget({ maxInsights = 5 }: ProactiveInsightsWidgetProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const { shouldShowProactiveInsights, isInQuietHours, settings } = useAutonomy();

  const showInsights = shouldShowProactiveInsights();
  const quietHours = isInQuietHours();

  const fetchInsights = async () => {
    // Don't fetch if we shouldn't show insights
    if (!showInsights && !quietHours) {
      setInsights([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/pulse/proactive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings }) });
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights || []);
      }
    } catch (e) {
      console.error("Failed to fetch proactive insights:", e);
    }
    setLoading(false);
    setLastFetch(new Date());
  };

  useEffect(() => {
    fetchInsights();
    // Refresh every 5 minutes
    const interval = setInterval(fetchInsights, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [showInsights]);

  // Zen mode - show nothing
  if (settings.globalLevel === "zen") {
    return null;
  }

  // Quiet hours or proactive insights disabled - show minimal state
  if (!showInsights) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-700/50 text-slate-500">
            {quietHours ? <Moon className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-medium text-slate-400">
              {quietHours ? "Quiet Hours Active" : "Proactive Insights Paused"}
            </h3>
            <p className="text-xs text-slate-500">
              {quietHours 
                ? `Until ${settings.quietHours.end}` 
                : "Enable in Settings → Autonomy"
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Critical only mode - filter to high priority only
  const displayInsights = settings.criticalOnly 
    ? insights.filter(i => i.priority === "high")
    : insights;

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white">Pulse Noticed</h3>
          {settings.criticalOnly && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
              Critical Only
            </span>
          )}
        </div>
        <button
          onClick={fetchInsights}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading && insights.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          </div>
        ) : displayInsights.length === 0 ? (
          <div className="text-center py-6">
            <Eye className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">All clear! Nothing urgent right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayInsights.slice(0, maxInsights).map((insight, idx) => {
              const config = TYPE_CONFIG[insight.type];
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-lg bg-slate-900/50 border ${
                    insight.priority === "high" 
                      ? "border-red-500/30" 
                      : "border-slate-700/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-lg bg-slate-800 ${config.color}`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white text-sm">{insight.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{insight.message}</p>
                      {insight.action?.href && (
                        <Link
                          href={insight.action.href}
                          className="inline-flex items-center gap-1 mt-2 text-xs text-purple-400 hover:text-purple-300"
                        >
                          {insight.action.label || "View"}
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {displayInsights.length > maxInsights && (
          <Link
            href="/notifications"
            className="mt-3 flex items-center justify-center gap-1 text-sm text-purple-400 hover:text-purple-300"
          >
            View all {displayInsights.length} insights
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Footer with last update */}
      {lastFetch && (
        <div className="px-4 py-2 border-t border-slate-700/50 text-xs text-slate-500">
          Last updated: {lastFetch.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
