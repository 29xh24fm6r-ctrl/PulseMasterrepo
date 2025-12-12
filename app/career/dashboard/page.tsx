// Career Dashboard
// app/career/dashboard/page.tsx

"use client";

import { useState, useEffect } from "react";
import {
  Trophy,
  TrendingUp,
  Target,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function CareerDashboardPage() {
  const [status, setStatus] = useState<any>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPromotion, setShowPromotion] = useState(false);
  const [rankData, setRankData] = useState<any>(null);
  const [guildData, setGuildData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [statusRes, missionsRes, rankRes, guildRes] = await Promise.all([
        fetch("/api/career/status"),
        fetch("/api/career/missions/today"),
        fetch("/api/scoreboard/my-rank"),
        fetch("/api/guilds/my"),
      ]);

      if (statusRes.ok) {
        const statusJson = await statusRes.json();
        setStatus(statusJson);
        if (statusJson.promoted) {
          setShowPromotion(true);
        }
      }

      if (missionsRes.ok) {
        const missionsJson = await missionsRes.json();
        setMissions(missionsJson.missions || []);
      }

      if (rankRes.ok) {
        const rankJson = await rankRes.json();
        setRankData(rankJson);
      }

      if (guildRes.ok) {
        const guildJson = await guildRes.json();
        setGuildData(guildJson);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function runAutopilotForMission() {
    try {
      await fetch("/api/autopilot/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "assist" }),
      });
      await loadData();
    } catch (err) {
      console.error("Failed to run autopilot:", err);
    }
  }

  function getLevelColor(level: string) {
    switch (level.toLowerCase()) {
      case "rookie":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      case "operator":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "pro":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "elite":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "legend":
        return "bg-violet-500/20 text-violet-400 border-violet-500/30";
      default:
        return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    }
  }

  function getDifficultyColor(difficulty: string) {
    switch (difficulty) {
      case "easy":
        return "bg-green-500/20 text-green-400";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400";
      case "hard":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-zinc-500/20 text-zinc-400";
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading career dashboard...</div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-4xl mx-auto text-center text-zinc-400">
          Please set your job profile in settings to view your career dashboard.
        </div>
      </div>
    );
  }

  const chartData = (status.recentScores || []).map((sc: any) => ({
    date: new Date(sc.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: Math.round((sc.overall_score || 0) * 100),
  }));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">Career Dashboard</h1>
            <p className="text-sm text-zinc-400">
              {status.job?.label || "Your Career"} • {status.track?.name || "Mastery Track"}
            </p>
          </div>
        </div>

        {/* Promotion Banner */}
        {showPromotion && (
          <div className="bg-gradient-to-r from-yellow-500/20 to-violet-500/20 border border-yellow-500/30 rounded-xl p-6 text-center">
            <div className="text-2xl font-bold text-yellow-400 mb-2">🎉 Level Up!</div>
            <div className="text-white">
              You've been promoted to <span className="font-semibold">{status.currentLevel.label}</span>!
            </div>
            <button
              onClick={() => setShowPromotion(false)}
              className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-sm transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Hero Card - Current Belt */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-zinc-400 mb-1">Your Current Level</div>
              <div className="flex items-center gap-3">
                <span
                  className={`px-4 py-2 rounded-lg border text-lg font-bold ${getLevelColor(
                    status.currentLevel.code
                  )}`}
                >
                  {status.currentLevel.label}
                </span>
                {status.nextLevel && (
                  <div className="text-sm text-zinc-400">
                    → Next: <span className="text-white">{status.nextLevel.label}</span>
                  </div>
                )}
              </div>
              {status.currentLevel.description && (
                <div className="text-sm text-zinc-400 mt-2">{status.currentLevel.description}</div>
              )}
              {/* Global Rank Snippet */}
              {rankData && rankData.trailingWeek?.percentile !== null && (
                <div className="mt-3 text-xs text-zinc-500">
                  Global Rank: Top{" "}
                  {(100 - rankData.trailingWeek.percentile).toFixed(1)}% of{" "}
                  {rankData.job?.label || "your job"}
                </div>
              )}
              {/* Guild Snippet */}
              {guildData && guildData.memberships && guildData.memberships.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <Users className="w-3 h-3 text-blue-400" />
                  <span className="text-xs text-blue-400">
                    Member of:{" "}
                    {guildData.memberships
                      .map((m: any) => m.guild?.name)
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-zinc-400 mb-1">Progress to Next Level</div>
              <div className="text-2xl font-bold text-violet-400">
                {Math.round(status.progressScore * 100)}%
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {status.nextLevel && (
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>
                  {Math.round(status.progressScore * status.nextLevel.min_days_at_or_above)} /{" "}
                  {status.nextLevel.min_days_at_or_above} days
                </span>
                <span>
                  Target: {Math.round((status.nextLevel.min_overall_score || 0) * 100)}% score
                </span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all"
                  style={{ width: `${status.progressScore * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Performance Trend */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Performance Trend
          </h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#10b981" name="Score %" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-zinc-400 py-8">No performance data yet</div>
          )}
        </div>

        {/* Today's Missions */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-400" />
              Today's Missions
            </h2>
            <button
              onClick={runAutopilotForMission}
              className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded text-sm transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Let Pulse Help
            </button>
          </div>

          {missions.length === 0 ? (
            <div className="text-center text-zinc-400 py-8">No missions assigned for today</div>
          ) : (
            <div className="space-y-3">
              {missions.map((mission) => (
                <div
                  key={mission.id}
                  className="border border-zinc-700 rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white">{mission.title}</h3>
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${getDifficultyColor(
                            mission.difficulty
                          )}`}
                        >
                          {mission.difficulty}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            mission.status === "completed"
                              ? "bg-green-500/20 text-green-400"
                              : mission.status === "in_progress"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-zinc-500/20 text-zinc-400"
                          }`}
                        >
                          {mission.status}
                        </span>
                      </div>
                      {mission.description && (
                        <p className="text-sm text-zinc-400">{mission.description}</p>
                      )}
                    </div>
                    {mission.reward_xp > 0 && (
                      <div className="text-right">
                        <div className="text-xs text-zinc-400">Reward</div>
                        <div className="text-sm font-semibold text-yellow-400">
                          +{mission.reward_xp} XP
                        </div>
                      </div>
                    )}
                  </div>
                  {mission.definition?.type === "autopilot_actions_completed" && (
                    <div className="mt-2">
                      <Link
                        href="/autopilot/command-center"
                        className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                      >
                        View Autopilot Actions
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Do-Next Recommendations */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Most Impactful Moves Right Now
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            <Link
              href="/deals/radar"
              className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:border-violet-500 transition-colors"
            >
              <div className="font-semibold text-white mb-1">Deal Radar</div>
              <div className="text-xs text-zinc-400">Review deals needing attention</div>
            </Link>
            <Link
              href="/simulation/paths"
              className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:border-violet-500 transition-colors"
            >
              <div className="font-semibold text-white mb-1">Simulate Next Level</div>
              <div className="text-xs text-zinc-400">
                See what {status.nextLevel?.label || "next level"} looks like
              </div>
            </Link>
            <Link
              href="/autopilot/command-center"
              className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:border-violet-500 transition-colors"
            >
              <div className="font-semibold text-white mb-1">Autopilot Actions</div>
              <div className="text-xs text-zinc-400">Review suggested actions</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

