// Voice Analytics Page
// app/analytics/voice/page.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface VoiceAnalyticsResponse {
  totalEvents: number;
  byEmotion: { emotion: string; count: number }[];
  byCoach: { coach_id: string; count: number }[];
  overridesUsage: { base_voice: string; final_voice: string; count: number }[];
  recentEvents: {
    id: string;
    coach_id: string;
    base_voice: string;
    final_voice: string;
    primary_emotion: string | null;
    temporary: boolean;
    created_at: string;
  }[];
}

const COACH_LABELS: Record<string, string> = {
  sales: "Sales",
  confidant: "Confidant",
  executive: "Executive",
  warrior: "Warrior",
  negotiation: "Negotiation",
  emotional: "Emotional",
  strategy: "Strategy",
};

const VOICE_LABELS: Record<string, string> = {
  pulse_default: "Pulse Default",
  calm_therapist: "Calm Therapist",
  hype_coach: "Hype Coach",
  jarvis_advisor: "Jarvis Advisor",
};

export default function VoiceAnalyticsPage() {
  const [data, setData] = useState<VoiceAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const res = await fetch("/api/voice/analytics");
      const json = await res.json();
      if (res.ok) {
        setData(json);
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
        <div className="text-zinc-400">Loading voice analytics...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-red-400">Failed to load analytics</div>
      </div>
    );
  }

  const overrideEvents = data.overridesUsage.reduce(
    (sum, row) => sum + row.count,
    0
  );
  const overridePercent =
    data.totalEvents > 0
      ? Math.round((overrideEvents / data.totalEvents) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/analytics"
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-6 h-6 text-violet-400" />
                Voice Analytics
              </h1>
              <p className="text-xs text-zinc-500">
                Track voice switching patterns and emotion-based adaptations
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <div className="text-sm text-zinc-400 mb-1">Total Voice Events</div>
            <div className="text-3xl font-bold text-white">{data.totalEvents}</div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <div className="text-sm text-zinc-400 mb-1">Adaptive Overrides</div>
            <div className="text-3xl font-bold text-violet-400">{overridePercent}%</div>
            <div className="text-xs text-zinc-500 mt-1">
              Sessions where voice changed from base persona
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <div className="text-sm text-zinc-400 mb-1">Override Events</div>
            <div className="text-3xl font-bold text-amber-400">{overrideEvents}</div>
            <div className="text-xs text-zinc-500 mt-1">
              Total adaptive voice switches
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Events by Emotion */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Events by Emotion
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byEmotion}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis
                    dataKey="emotion"
                    stroke="#a1a1aa"
                    tick={{ fill: "#a1a1aa" }}
                  />
                  <YAxis stroke="#a1a1aa" tick={{ fill: "#a1a1aa" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Events by Coach */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Events by Coach
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byCoach}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis
                    dataKey="coach_id"
                    stroke="#a1a1aa"
                    tick={{ fill: "#a1a1aa" }}
                    tickFormatter={(value) => COACH_LABELS[value] || value}
                  />
                  <YAxis stroke="#a1a1aa" tick={{ fill: "#a1a1aa" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    labelFormatter={(value) => COACH_LABELS[value] || value}
                  />
                  <Bar dataKey="count" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Events Table */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Recent Voice Switches
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-2 px-3 text-zinc-400">Time</th>
                  <th className="text-left py-2 px-3 text-zinc-400">Coach</th>
                  <th className="text-left py-2 px-3 text-zinc-400">Emotion</th>
                  <th className="text-left py-2 px-3 text-zinc-400">Base Voice</th>
                  <th className="text-left py-2 px-3 text-zinc-400">Final Voice</th>
                  <th className="text-left py-2 px-3 text-zinc-400">Type</th>
                </tr>
              </thead>
              <tbody>
                {data.recentEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      No voice switch events yet
                    </td>
                  </tr>
                ) : (
                  data.recentEvents.map((event) => (
                    <tr
                      key={event.id}
                      className="border-b border-zinc-800 hover:bg-zinc-800/50"
                    >
                      <td className="py-2 px-3 text-zinc-300">
                        {new Date(event.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-zinc-300">
                        {COACH_LABELS[event.coach_id] || event.coach_id}
                      </td>
                      <td className="py-2 px-3 text-zinc-300 capitalize">
                        {event.primary_emotion || "none"}
                      </td>
                      <td className="py-2 px-3 text-zinc-300">
                        {VOICE_LABELS[event.base_voice] || event.base_voice}
                      </td>
                      <td className="py-2 px-3 text-zinc-300">
                        {VOICE_LABELS[event.final_voice] || event.final_voice}
                      </td>
                      <td className="py-2 px-3">
                        {event.temporary ? (
                          <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs">
                            Adaptive
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-zinc-700 text-zinc-300 rounded text-xs">
                            Default
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

