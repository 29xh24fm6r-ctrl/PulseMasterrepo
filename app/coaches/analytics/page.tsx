"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, BarChart3, Target, Activity } from "lucide-react";

export default function CoachAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setLoading(true);
    try {
      // Load sessions
      const sessionsRes = await fetch("/api/coaches/analytics/sessions");
      const sessionsData = await sessionsRes.json();
      if (sessionsRes.ok) {
        setSessions(sessionsData.sessions || []);
        setStats(sessionsData.stats || null);
      }
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <nav className="flex items-center gap-2 text-xs text-zinc-500 mb-3">
            <Link href="/coaches" className="hover:text-zinc-300 transition-colors">
              Coaches Corner
            </Link>
            <span>/</span>
            <span className="text-zinc-400">Analytics</span>
          </nav>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/coaches"
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Coaching Analytics</h1>
                <p className="text-xs text-zinc-500">
                  Track your skill development and performance over time
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats Cards */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
            {stats && (
              <>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-zinc-400">Total Sessions</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{stats.totalSessions || 0}</div>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-zinc-400">Avg Score</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {stats.averageScore ? Math.round(stats.averageScore) : 0}
                  </div>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-violet-400" />
                    <span className="text-sm text-zinc-400">High Performers</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{stats.highPerformers || 0}</div>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-zinc-400">Current Difficulty</span>
                  </div>
                  <div className="text-2xl font-bold text-white capitalize">
                    {stats.currentDifficulty || "beginner"}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Recent Sessions */}
          <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Sessions</h2>
            <div className="space-y-3">
              {sessions.length === 0 ? (
                <div className="text-zinc-400 text-sm text-center py-8">
                  No sessions yet. Start practicing to see your progress!
                </div>
              ) : (
                sessions.slice(0, 10).map((session: any, idx: number) => (
                  <div
                    key={idx}
                    className="border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-white">
                        {session.scenario_type || "Training Session"}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {new Date(session.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      {session.performance_score && (
                        <div>
                          <span className="text-zinc-500">Score: </span>
                          <span className="text-white font-medium">{session.performance_score}/100</span>
                        </div>
                      )}
                      {session.difficulty && (
                        <div>
                          <span className="text-zinc-500">Difficulty: </span>
                          <span className="text-white capitalize">{session.difficulty}</span>
                        </div>
                      )}
                      {session.skill_nodes && session.skill_nodes.length > 0 && (
                        <div>
                          <span className="text-zinc-500">Skills: </span>
                          <span className="text-white">
                            {session.skill_nodes.slice(0, 2).join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Skill Distribution */}
          <div className="lg:col-span-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Skill Distribution</h2>
            {stats?.skillFrequency && Object.keys(stats.skillFrequency).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(stats.skillFrequency)
                  .sort(([, a]: any, [, b]: any) => b - a)
                  .slice(0, 5)
                  .map(([skill, count]: [string, any]) => (
                    <div key={skill} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-300">{skill.replace(/_/g, " ")}</span>
                      <span className="text-violet-400 font-medium">{count}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-zinc-400 text-sm">No skill data yet</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

