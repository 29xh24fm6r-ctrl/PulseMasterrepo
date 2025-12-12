// Life Trajectory Page
// app/analytics/trajectory/page.tsx

"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

interface TrajectoryPoint {
  date: string;
  stressCount: number;
  calmCount: number;
  mxpEarned: number;
  sessionsCount: number;
  topIdentityName?: string | null;
  topIdentityXP?: number;
}

export default function TrajectoryPage() {
  const [points, setPoints] = useState<TrajectoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrajectory();
  }, []);

  async function loadTrajectory() {
    try {
      const res = await fetch("/api/analytics/trajectory?days=90");
      const data = await res.json();
      if (res.ok) {
        setPoints(data.points || []);
      }
    } catch (err) {
      console.error("Failed to load trajectory:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading trajectory...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Life Trajectory</h1>
          <p className="text-sm text-zinc-400">
            Your emotional and growth journey over the last 90 days
          </p>
        </div>

        {/* Emotion Chart */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Emotional Journey</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis
                  dataKey="date"
                  stroke="#a1a1aa"
                  tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                />
                <YAxis stroke="#a1a1aa" tick={{ fill: "#a1a1aa" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="stressCount"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Stress Events"
                  dot={{ fill: "#ef4444", r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="calmCount"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Calm Events"
                  dot={{ fill: "#10b981", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* MXP Chart */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Mental Mastery XP (MXP)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={points}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis
                  dataKey="date"
                  stroke="#a1a1aa"
                  tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                />
                <YAxis stroke="#a1a1aa" tick={{ fill: "#a1a1aa" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Bar dataKey="mxpEarned" fill="#8b5cf6" name="MXP Earned" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sessions Chart */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Coaching Sessions</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={points}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis
                  dataKey="date"
                  stroke="#a1a1aa"
                  tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                />
                <YAxis stroke="#a1a1aa" tick={{ fill: "#a1a1aa" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Bar dataKey="sessionsCount" fill="#3b82f6" name="Sessions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

