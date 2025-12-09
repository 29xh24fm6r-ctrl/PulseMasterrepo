"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { Target, Star, Zap, TrendingUp, Loader2, Sparkles } from "lucide-react";

interface Value {
  value_name: string;
  importance_rank: number;
  confidence: number;
}

interface Strength {
  strength_name: string;
  category: string;
  confidence: number;
}

interface MomentumDay {
  date: string;
  alignment_score: number;
  net_momentum: number;
}

export default function IdentityGraphsPage() {
  const { userId } = useAuth();
  const [values, setValues] = useState<Value[]>([]);
  const [strengths, setStrengths] = useState<Strength[]>([]);
  const [momentum, setMomentum] = useState<MomentumDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch("/api/identity/profile");
      if (res.ok) {
        const data = await res.json();
        setValues(data.values || []);
        setStrengths(data.strengths || []);
        setMomentum(data.momentum || []);
      }
    } catch (error) {
      console.error("Failed to fetch identity data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Prepare radar chart data for values
  const radarData = values.slice(0, 6).map((v) => ({
    name: v.value_name,
    value: v.confidence * 100,
    fullMark: 100,
  }));

  // Prepare strength chart data
  const strengthData = strengths.slice(0, 8).map((s) => ({
    name: s.strength_name.length > 12 ? s.strength_name.substring(0, 12) + "..." : s.strength_name,
    confidence: s.confidence * 100,
    category: s.category,
  }));

  const categoryColors: Record<string, string> = {
    cognitive: "#06b6d4",
    interpersonal: "#ec4899",
    execution: "#22c55e",
    creative: "#f59e0b",
    leadership: "#8b5cf6",
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Target className="w-8 h-8 text-violet-400" />
            Identity Intelligence
          </h1>
          <p className="text-zinc-400 mt-2">Visualize your values, strengths, and growth trajectory</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Values Radar Chart */}
          <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              Core Values
            </h2>
            {radarData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 10 }} />
                    <Radar
                      name="Confidence"
                      dataKey="value"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px" }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-zinc-500">
                <div className="text-center">
                  <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No values defined yet</p>
                  <p className="text-sm mt-2">Add values in your Identity profile</p>
                </div>
              </div>
            )}
          </div>

          {/* Strengths Bar Chart */}
          <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              Top Strengths
            </h2>
            {strengthData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={strengthData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} stroke="#9ca3af" fontSize={12} />
                    <YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={11} width={100} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px" }}
                      formatter={(value: number) => [`${value.toFixed(0)}%`, "Confidence"]}
                    />
                    <Bar dataKey="confidence" radius={[0, 4, 4, 0]}>
                      {strengthData.map((entry, index) => (
                        <Cell key={index} fill={categoryColors[entry.category] || "#8b5cf6"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-zinc-500">
                <div className="text-center">
                  <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No strengths identified yet</p>
                </div>
              </div>
            )}

            {/* Category Legend */}
            <div className="flex flex-wrap gap-3 mt-4">
              {Object.entries(categoryColors).map(([cat, color]) => (
                <div key={cat} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs text-zinc-400 capitalize">{cat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Identity Momentum Chart */}
          <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Identity Momentum (Last 30 Days)
            </h2>
            {momentum.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={momentum}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" tickFormatter={formatDate} stroke="#9ca3af" fontSize={12} />
                    <YAxis domain={[-1, 1]} stroke="#9ca3af" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px" }}
                      labelFormatter={formatDate}
                    />
                    <Line
                      name="Net Momentum"
                      type="monotone"
                      dataKey="net_momentum"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ fill: "#22c55e", strokeWidth: 0, r: 4 }}
                    />
                    <Line
                      name="Alignment"
                      type="monotone"
                      dataKey="alignment_score"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ fill: "#8b5cf6", strokeWidth: 0, r: 4 }}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-zinc-500">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No momentum data yet</p>
                  <p className="text-sm mt-2">Complete tasks aligned with your values to build momentum</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Identity Insights */}
        <div className="mt-6 bg-gradient-to-r from-violet-500/10 to-pink-500/10 rounded-2xl p-6 border border-violet-500/20">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            Identity Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-900/50 rounded-xl p-4">
              <p className="text-sm text-zinc-400 mb-1">Top Value</p>
              <p className="text-lg font-semibold">{values[0]?.value_name || "Not defined"}</p>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4">
              <p className="text-sm text-zinc-400 mb-1">Top Strength</p>
              <p className="text-lg font-semibold">{strengths[0]?.strength_name || "Not identified"}</p>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4">
              <p className="text-sm text-zinc-400 mb-1">Current Momentum</p>
              <p className={`text-lg font-semibold ${
                (momentum[0]?.net_momentum || 0) > 0 ? "text-green-400" : 
                (momentum[0]?.net_momentum || 0) < 0 ? "text-red-400" : "text-zinc-400"
              }`}>
                {momentum[0]?.net_momentum 
                  ? (momentum[0].net_momentum > 0 ? "+" : "") + momentum[0].net_momentum.toFixed(2)
                  : "Neutral"
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}