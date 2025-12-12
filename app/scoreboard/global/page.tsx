// Global Scoreboard Page
// app/scoreboard/global/page.tsx

"use client";

import { useState, useEffect } from "react";
import {
  Trophy,
  TrendingUp,
  Users,
  Target,
  Zap,
  ArrowRight,
  Sparkles,
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

export default function GlobalScoreboardPage() {
  const [rankData, setRankData] = useState<any>(null);
  const [guildData, setGuildData] = useState<any>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [rankRes, guildRes, missionsRes] = await Promise.all([
        fetch("/api/scoreboard/my-rank"),
        fetch("/api/guilds/my"),
        fetch("/api/career/missions/today"),
      ]);

      if (rankRes.ok) {
        const rankJson = await rankRes.json();
        setRankData(rankJson);
      }

      if (guildRes.ok) {
        const guildJson = await guildRes.json();
        setGuildData(guildJson);
      }

      if (missionsRes.ok) {
        const missionsJson = await missionsRes.json();
        setMissions(missionsJson.missions || []);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function runAutopilotForScoreboard() {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading scoreboard...</div>
      </div>
    );
  }

  if (!rankData) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-4xl mx-auto text-center text-zinc-400">
          Please set your job profile to view your global rank.
        </div>
      </div>
    );
  }

  const percentile = rankData.trailingWeek?.percentile || rankData.today?.percentile || 0;
  const topPercent = 100 - percentile;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">Global Scoreboard</h1>
            <p className="text-sm text-zinc-400">
              {rankData.job?.label || "Your Performance"} • Anonymous Rankings
            </p>
          </div>
        </div>

        {/* Where You Stand */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Where You Stand</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="text-sm text-zinc-400 mb-2">Last 7 Days</div>
              <div className="text-4xl font-bold text-violet-400 mb-2">
                Top {topPercent.toFixed(1)}%
              </div>
              <div className="text-sm text-zinc-400">
                {rankData.trailingWeek?.avgScore
                  ? `Average Score: ${Math.round(rankData.trailingWeek.avgScore * 100)}%`
                  : "No data"}
              </div>
            </div>
            <div>
              <div className="text-sm text-zinc-400 mb-2">Today</div>
              <div className="text-4xl font-bold text-blue-400 mb-2">
                {rankData.today?.percentile !== null
                  ? `Top ${(100 - rankData.today.percentile).toFixed(1)}%`
                  : "N/A"}
              </div>
              <div className="text-sm text-zinc-400">
                {rankData.today?.score
                  ? `Score: ${Math.round(rankData.today.score * 100)}%`
                  : "No data"}
              </div>
            </div>
          </div>

          {/* Percentile Gauge */}
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>0%</span>
              <span>Your Position</span>
              <span>100%</span>
            </div>
            <div className="h-4 bg-zinc-800 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all"
                style={{ width: `${percentile}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white"
                style={{ left: `${percentile}%` }}
              />
            </div>
            <div className="text-xs text-zinc-500 mt-1 text-center">
              {percentile.toFixed(1)}th percentile
            </div>
          </div>
        </div>

        {/* Guild Performance */}
        {guildData && guildData.memberships && guildData.memberships.length > 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Your Guilds
            </h2>
            <div className="space-y-3">
              {guildData.memberships.map((membership: any) => {
                const guild = membership.guild || {};
                const scorecard = guildData.scorecards?.find(
                  (sc: any) => sc.guild_id === membership.guildId
                );

                return (
                  <div
                    key={membership.id}
                    className="border border-zinc-700 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-semibold text-white">{guild.name}</div>
                        <div className="text-xs text-zinc-400">{guild.description}</div>
                      </div>
                      {scorecard && (
                        <div className="text-right">
                          <div className="text-sm text-zinc-400">Avg Score</div>
                          <div className="text-lg font-bold text-green-400">
                            {Math.round((scorecard.avg_score || 0) * 100)}%
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {scorecard?.member_count || 0} members
                    </div>
                  </div>
                );
              })}
            </div>
            <Link
              href="/guilds"
              className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1"
            >
              View Guild Leaderboard
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Join a Guild
            </h2>
            <div className="text-sm text-zinc-400">
              Join a guild to see how your team performs and compete together.
            </div>
            <Link
              href="/guilds"
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors inline-flex items-center gap-2"
            >
              Browse Guilds
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Today's Focus */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-green-400" />
              Today's Focus
            </h2>
            <button
              onClick={runAutopilotForScoreboard}
              className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded text-sm transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Let Autopilot Help
            </button>
          </div>
          {rankData.trailingWeek?.percentile !== null && (
            <div className="text-sm text-zinc-300 mb-4">
              To climb from {rankData.trailingWeek.percentile.toFixed(1)}% → 80%, focus on:
            </div>
          )}
          {missions.length > 0 ? (
            <div className="space-y-2">
              {missions.slice(0, 3).map((mission) => (
                <div
                  key={mission.id}
                  className="flex items-center gap-2 text-sm text-zinc-300"
                >
                  <span className="text-violet-400">•</span>
                  <span>{mission.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-zinc-400">
              No missions assigned. Check your Career Dashboard.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




