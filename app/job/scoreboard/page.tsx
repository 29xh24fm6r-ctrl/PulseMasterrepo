// Job Scoreboard Page
// app/job/scoreboard/page.tsx

"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Target, CheckCircle2, Clock } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

export default function JobScoreboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [scorecards, setScorecards] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [profileRes, scorecardsRes] = await Promise.all([
        fetch("/api/jobs/profile"),
        fetch("/api/jobs/scoreboard?days=30"),
      ]);

      if (profileRes.ok) {
        const profileJson = await profileRes.json();
        setProfile(profileJson);
      }

      if (scorecardsRes.ok) {
        const scorecardsJson = await scorecardsRes.json();
        setScorecards(scorecardsJson.scorecards || []);
        setKpis(scorecardsJson.kpis || []);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading scoreboard...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-4xl mx-auto text-center text-zinc-400">
          Please set your job profile in settings to view your scoreboard.
        </div>
      </div>
    );
  }

  const latestScorecard = scorecards[0];
  const chartData = scorecards
    .slice()
    .reverse()
    .map((sc) => ({
      date: sc.scorecard_date,
      score: Math.round((sc.overall_score || 0) * 100),
    }));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-green-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">Job Scoreboard</h1>
            <p className="text-sm text-zinc-400">
              {profile.custom_title || profile.job_node?.name || "Your Performance"}
            </p>
          </div>
        </div>

        {/* Overall Score Trend */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Score Trend (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#10b981" name="Score %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Today's Score */}
        {latestScorecard && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Today's Performance</h2>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-green-400">
                {Math.round((latestScorecard.overall_score || 0) * 100)}%
              </div>
              <div className="flex-1">
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${(latestScorecard.overall_score || 0) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KPI Breakdown */}
        {latestScorecard && kpis.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">KPI Breakdown</h2>
            <div className="space-y-3">
              {kpis.map((kpi) => {
                const actual = latestScorecard.kpi_values?.[kpi.kpi_key] || 0;
                const target = kpi.target_value || 1;
                const score = latestScorecard.kpi_scores?.[kpi.kpi_key] || 0;

                return (
                  <div key={kpi.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-300">{kpi.name}</span>
                      <span className="text-zinc-400">
                        {actual.toFixed(1)} / {target} ({Math.round(score * 100)}%)
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500"
                        style={{ width: `${Math.min(100, (actual / target) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}




