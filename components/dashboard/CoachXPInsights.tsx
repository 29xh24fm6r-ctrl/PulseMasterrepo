"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Target, Zap, Award } from "lucide-react";

interface CoachXPInsightsData {
  xpEarned: {
    total: number;
    breakdown: Record<string, number>;
    recent: Array<{ activity: string; amount: number; category: string; wasCrit?: boolean }>;
  };
  areasOfStrength: string[];
  recommendedSkills: string[];
  sessionStats: {
    total: number;
    averageScore: number;
    highPerformers: number;
  };
}

export function CoachXPInsights() {
  const [data, setData] = useState<CoachXPInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month">("week");

  useEffect(() => {
    loadInsights();
  }, [period]);

  async function loadInsights() {
    setLoading(true);
    try {
      const res = await fetch(`/api/xp/coach-insights?period=${period}`);
      const data = await res.json();
      if (res.ok) {
        setData(data);
      }
    } catch (err) {
      console.error("Failed to load coach insights:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <div className="text-zinc-400 text-sm">Loading insights...</div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          Coach XP Insights
        </h3>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as "week" | "month")}
          className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>

      {/* XP Earned */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Award className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium text-zinc-300">XP Earned</span>
        </div>
        <div className="text-2xl font-bold text-violet-400">{data.xpEarned.total}</div>
        <div className="text-xs text-zinc-500 mt-1">
          {data.sessionStats.total} sessions • Avg score: {Math.round(data.sessionStats.averageScore)}/100
        </div>
      </div>

      {/* Areas of Strength */}
      {data.areasOfStrength.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-zinc-300">Areas of Strength</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.areasOfStrength.map((skill, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs"
              >
                {skill.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Skills */}
      {data.recommendedSkills.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium text-zinc-300">Recommended to Train</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.recommendedSkills.map((skill, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs"
              >
                {skill.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent Gains */}
      {data.xpEarned.recent.length > 0 && (
        <div>
          <div className="text-sm font-medium text-zinc-300 mb-2">Recent Gains</div>
          <div className="space-y-1">
            {data.xpEarned.recent.slice(0, 3).map((gain, idx) => (
              <div key={idx} className="text-xs text-zinc-400 flex items-center justify-between">
                <span>{gain.activity.replace(/_/g, " ")}</span>
                <span className="text-violet-400">
                  +{gain.amount} {gain.category}
                  {gain.wasCrit && " ⚡"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

