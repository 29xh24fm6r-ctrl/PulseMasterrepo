// Session Timeline Page
// app/coaches/[coachId]/session/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Zap, Activity } from "lucide-react";
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

interface Turn {
  turnIndex: number;
  userMessage: string;
  coachReply: string;
  emotion: string | null;
  intent: string;
  voiceId: string;
  rationale: string | null;
  xpEarned: number;
  created_at: string;
}

interface EmotionalTransition {
  from: string | null;
  to: string | null;
  turnIndex: number;
  xpEarned: number;
}

interface SessionTimeline {
  session: {
    id: string;
    coach_id: string;
    started_at: string;
    ended_at: string | null;
    emotion_start: string | null;
    emotion_end: string | null;
    xp_earned: number;
    total_turns: number;
  };
  turns: Turn[];
  emotionalTransitions: EmotionalTransition[];
  totalXPEarned: number;
}

const COACH_LABELS: Record<string, string> = {
  sales: "Sales Coach",
  confidant: "Confidant Coach",
  executive: "Executive Coach",
  warrior: "Warrior Coach",
  negotiation: "Negotiation Coach",
  emotional: "Emotional Coach",
  strategy: "Strategy Coach",
};

const INTENT_LABELS: Record<string, string> = {
  soothe: "Soothe",
  stabilize: "Stabilize",
  hype: "Hype",
  challenge: "Challenge",
  clarify: "Clarify",
  plan: "Plan",
  celebrate: "Celebrate",
  reframe: "Reframe",
};

export default function SessionTimelinePage() {
  const params = useParams();
  const router = useRouter();
  const coachId = params.coachId as string;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<SessionTimeline | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get active session or most recent session
    loadSession();
  }, [coachId]);

  async function loadSession() {
    setLoading(true);
    try {
      // Try to get active session first
      const activeRes = await fetch(`/api/coaching/session/active?coachId=${coachId}`);
      if (activeRes.ok) {
        const activeData = await activeRes.json();
        if (activeData.sessionId) {
          setSessionId(activeData.sessionId);
          loadTimeline(activeData.sessionId);
          return;
        }
      }

      // Fallback: get most recent session
      const recentRes = await fetch(`/api/coaching/session/recent?coachId=${coachId}&limit=1`);
      if (recentRes.ok) {
        const recentData = await recentRes.json();
        if (recentData.sessions && recentData.sessions.length > 0) {
          const latestSessionId = recentData.sessions[0].id;
          setSessionId(latestSessionId);
          loadTimeline(latestSessionId);
          return;
        }
      }

      setLoading(false);
    } catch (err) {
      console.error("Failed to load session:", err);
      setLoading(false);
    }
  }

  async function loadTimeline(id: string) {
    try {
      const res = await fetch(`/api/coaching/session/timeline?sessionId=${id}`);
      const data = await res.json();
      if (res.ok) {
        setTimeline(data);
      }
    } catch (err) {
      console.error("Failed to load timeline:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading session timeline...</div>
      </div>
    );
  }

  if (!timeline) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center text-zinc-400">
          No session found. Start a coaching session to see the timeline.
        </div>
      </div>
    );
  }

  // Prepare chart data
  const emotionChartData = timeline.turns.map((turn, idx) => ({
    turn: turn.turnIndex,
    emotion: turn.emotion || "neutral",
    timestamp: new Date(turn.created_at).toLocaleTimeString(),
  }));

  const intentChartData = timeline.turns.map((turn) => ({
    intent: INTENT_LABELS[turn.intent] || turn.intent,
    count: 1,
  }));

  const xpChartData = timeline.turns.map((turn) => ({
    turn: turn.turnIndex,
    xp: turn.xpEarned,
    cumulative: timeline.turns
      .filter((t) => t.turn_index <= turn.turnIndex)
      .reduce((sum, t) => sum + t.xp_earned, 0),
  }));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/coaches/${coachId}`}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">
                {COACH_LABELS[coachId] || coachId} - Session Timeline
              </h1>
              <p className="text-xs text-zinc-500">
                Emotional flight recorder for this coaching session
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="text-sm text-zinc-400 mb-1">Total Turns</div>
            <div className="text-2xl font-bold text-white">{timeline.turns.length}</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="text-sm text-zinc-400 mb-1">XP Earned</div>
            <div className="text-2xl font-bold text-violet-400">{timeline.totalXPEarned}</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="text-sm text-zinc-400 mb-1">Emotional Transitions</div>
            <div className="text-2xl font-bold text-amber-400">
              {timeline.emotionalTransitions.length}
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="text-sm text-zinc-400 mb-1">Start → End Emotion</div>
            <div className="text-sm font-medium text-white capitalize">
              {timeline.session.emotion_start || "neutral"} → {timeline.session.emotion_end || "neutral"}
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Emotion Timeline */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Emotional Journey
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={emotionChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis
                    dataKey="turn"
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
                  <Line
                    type="monotone"
                    dataKey="emotion"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ fill: "#8b5cf6", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* XP Progression */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              XP Progression
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={xpChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis
                    dataKey="turn"
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
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="xp"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="XP per Turn"
                    dot={{ fill: "#10b981", r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="Cumulative XP"
                    dot={{ fill: "#8b5cf6", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Turn-by-Turn Timeline */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Turn-by-Turn Timeline
          </h2>
          <div className="space-y-4">
            {timeline.turns.map((turn, idx) => {
              const transition = timeline.emotionalTransitions.find(
                (t) => t.turnIndex === turn.turnIndex
              );
              return (
                <div
                  key={turn.id || idx}
                  className="border-l-2 border-zinc-700 pl-4 py-2 space-y-2"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-zinc-300">Turn {turn.turnIndex}</span>
                    {turn.emotion && (
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs capitalize">
                        {turn.emotion}
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded text-xs">
                      {INTENT_LABELS[turn.intent] || turn.intent}
                    </span>
                    {turn.xpEarned > 0 && (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                        +{turn.xpEarned} XP
                      </span>
                    )}
                  </div>
                  {transition && (
                    <div className="text-xs text-zinc-400">
                      Emotional transition: {transition.from || "neutral"} → {transition.to || "neutral"}
                    </div>
                  )}
                  <div className="text-sm text-zinc-300">
                    <div className="mb-1">
                      <span className="font-medium">You:</span> {turn.userMessage}
                    </div>
                    <div>
                      <span className="font-medium">Coach:</span> {turn.coachReply}
                    </div>
                  </div>
                  {turn.rationale && (
                    <div className="text-xs text-zinc-500 italic">{turn.rationale}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

