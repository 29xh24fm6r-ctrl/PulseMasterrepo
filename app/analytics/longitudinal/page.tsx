"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, Calendar, Activity, Brain, Heart, Zap, Loader2 } from "lucide-react";

interface DailyMetric {
  date: string;
  tasks_completed: number;
  productivity_score: number;
  avg_emotion_valence: number;
  avg_emotion_intensity: number;
  identity_alignment: number;
  sessions_duration_minutes: number;
}

export default function LongitudinalPage() {
  const { userId } = useAuth();
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    fetchMetrics();
  }, [range]);

  async function fetchMetrics() {
    setLoading(true);
    try {
      const res = await fetch(`/api/longitudinal/metrics?range=${range}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics || []);
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Calculate averages
  const avgProductivity = metrics.length > 0
    ? (metrics.reduce((sum, m) => sum + (m.productivity_score || 0), 0) / metrics.length).toFixed(1)
    : "0";
  const avgTasks = metrics.length > 0
    ? (metrics.reduce((sum, m) => sum + (m.tasks_completed || 0), 0) / metrics.length).toFixed(1)
    : "0";
  const avgValence = metrics.length > 0
    ? (metrics.reduce((sum, m) => sum + (m.avg_emotion_valence || 0), 0) / metrics.length).toFixed(2)
    : "0";

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-cyan-400" />
              Longitudinal Analytics
            </h1>
            <p className="text-zinc-400 mt-2">Track your progress over time</p>
          </div>

          {/* Range Selector */}
          <div className="flex gap-2">
            {(["7d", "30d", "90d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  range === r ? "bg-cyan-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "90 Days"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm">Avg Productivity</span>
                </div>
                <p className="text-3xl font-bold text-cyan-400">{avgProductivity}<span className="text-lg text-zinc-500">/10</span></p>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                  <Activity className="w-4 h-4" />
                  <span className="text-sm">Avg Tasks/Day</span>
                </div>
                <p className="text-3xl font-bold text-green-400">{avgTasks}</p>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                  <Heart className="w-4 h-4" />
                  <span className="text-sm">Avg Mood</span>
                </div>
                <p className="text-3xl font-bold text-pink-400">{avgValence}</p>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Days Tracked</span>
                </div>
                <p className="text-3xl font-bold text-violet-400">{metrics.length}</p>
              </div>
            </div>

            {/* Productivity Chart */}
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50 mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                Productivity Over Time
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics}>
                    <defs>
                      <linearGradient id="productivityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" tickFormatter={formatDate} stroke="#9ca3af" fontSize={12} />
                    <YAxis domain={[0, 10]} stroke="#9ca3af" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px" }}
                      labelFormatter={formatDate}
                    />
                    <Area
                      type="monotone"
                      dataKey="productivity_score"
                      stroke="#06b6d4"
                      fillOpacity={1}
                      fill="url(#productivityGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tasks & Focus Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-400" />
                  Tasks Completed
                </h2>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" tickFormatter={formatDate} stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px" }}
                        labelFormatter={formatDate}
                      />
                      <Bar dataKey="tasks_completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-violet-400" />
                  Identity Alignment
                </h2>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" tickFormatter={formatDate} stroke="#9ca3af" fontSize={12} />
                      <YAxis domain={[0, 1]} stroke="#9ca3af" fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px" }}
                        labelFormatter={formatDate}
                      />
                      <Line
                        type="monotone"
                        dataKey="identity_alignment"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={{ fill: "#8b5cf6", strokeWidth: 0, r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Emotional Journey */}
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-400" />
                Emotional Journey
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" tickFormatter={formatDate} stroke="#9ca3af" fontSize={12} />
                    <YAxis domain={[-1, 1]} stroke="#9ca3af" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px" }}
                      labelFormatter={formatDate}
                    />
                    <Legend />
                    <Line
                      name="Mood (Valence)"
                      type="monotone"
                      dataKey="avg_emotion_valence"
                      stroke="#ec4899"
                      strokeWidth={2}
                      dot={{ fill: "#ec4899", strokeWidth: 0, r: 3 }}
                    />
                    <Line
                      name="Intensity"
                      type="monotone"
                      dataKey="avg_emotion_intensity"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={{ fill: "#f97316", strokeWidth: 0, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}