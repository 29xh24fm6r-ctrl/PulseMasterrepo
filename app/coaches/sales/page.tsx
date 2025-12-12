"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Send, CheckCircle2, AlertCircle, Target, TrendingUp, Zap } from "lucide-react";
import { VoiceStatusBadge } from "@/app/components/voice/voice-status-badge";
import { useVoicePlayer } from "@/hooks/useVoicePlayer";

type RoleplayMessage = {
  role: "user" | "coach" | "customer";
  content: string;
  timestamp?: string;
};

type CoachFeedbackV2 = {
  whatWentWell: string[];
  whatToImprove: string[];
  suggestedDrills: string[];
  confidenceScore: number;
};

type ScenarioInfo = {
  id: string;
  title: string;
  difficulty: string;
};

export default function SalesCoachPage() {
  const [messages, setMessages] = useState<RoleplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  // v2.5: New state
  const [feedback, setFeedback] = useState<CoachFeedbackV2 | null>(null);
  const [scenarioInfo, setScenarioInfo] = useState<ScenarioInfo | null>(null);
  const [difficultyLevel, setDifficultyLevel] = useState<string>("beginner");
  
  // Voice player hook
  const { speakText, profile, isPlaying } = useVoicePlayer();
  
  // Emotion-aware reply intent
  const [lastIntent, setLastIntent] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionXP, setSessionXP] = useState<number>(0);
  const [greeting, setGreeting] = useState<string | null>(null);

  // Load greeting on mount
  useEffect(() => {
    loadGreeting();
  }, []);

  async function loadGreeting() {
    try {
      const res = await fetch(`/api/coaching/greeting?coachId=sales`);
      const data = await res.json();
      if (res.ok && data.greeting) {
        setGreeting(data.greeting);
      }
    } catch (err) {
      console.error("Failed to load greeting:", err);
    }
  }

  async function sendTurn(endSession = false) {
    if (!input.trim() || loading) return;

    const newMessages = [
      ...messages,
      { role: "user" as const, content: input.trim() },
    ];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/coaches/sales/roleplay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioType: "sales:vehicle_price_objection",
          messages: newMessages,
          difficulty: "normal",
          endSession,
          useOrchestrator: true, // v3.6: Enable emotion-aware orchestrator
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Coach error");

      setMessages(data.updatedMessages);
      
      // v2.5: Update feedback and scenario info
      if (data.feedback) {
        setFeedback(data.feedback);
      }
      if (data.scenario) {
        setScenarioInfo(data.scenario);
      }
      if (data.difficultyLevel) {
        setDifficultyLevel(data.difficultyLevel);
      }
      
      // Emotion-aware: Update intent if provided
      if (data.intent) {
        setLastIntent(data.intent.label);
      }
      
      // Session tracking
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
      if (data.totalSessionXP !== undefined) {
        setSessionXP(data.totalSessionXP);
      }
      
      // End session if requested
      if (endSession) {
        setSessionEnded(true);
        if (sessionId) {
          try {
            await fetch("/api/coaching/session/end", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId,
                emotionEnd: data.detectedEmotion?.primary || null,
              }),
            });
          } catch (err) {
            console.error("Failed to end session:", err);
          }
        }
      }
      
      // Optional: Use voice player to speak the coach reply
      if (data.coachMessage && profile) {
        // speakText will automatically get the right voice profile
        // speakText("sales", data.coachMessage, input.trim()).catch(console.error);
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong with the Sales Coach.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <nav className="flex items-center gap-2 text-xs text-zinc-500 mb-3">
            <Link href="/coaches" className="hover:text-zinc-300 transition-colors">
              Coaches Corner
            </Link>
            <span>/</span>
            <span className="text-zinc-400">Sales Coach</span>
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
                <h1 className="text-xl font-bold text-white">Sales Coach – Roleplay</h1>
                <p className="text-xs text-zinc-500">
                  Practice realistic price objection scenarios. The coach remembers what you&apos;ve learned and gives targeted feedback.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {sessionXP > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-700 bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
                  <Zap className="w-3 h-3" />
                  {sessionXP} XP
                </span>
              )}
              {lastIntent && (
                <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800/50 px-2 py-0.5 text-xs text-zinc-300">
                  Reply mode: {lastIntent}
                </span>
              )}
              <VoiceStatusBadge coachId="sales" profile={profile} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main chat area */}
          <div className="lg:col-span-2 space-y-4">
            {/* v2.5: Scenario Panel */}
            {scenarioInfo && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white">{scenarioInfo.title}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    difficultyLevel === "beginner" ? "bg-green-500/20 text-green-400" :
                    difficultyLevel === "intermediate" ? "bg-yellow-500/20 text-yellow-400" :
                    difficultyLevel === "advanced" ? "bg-orange-500/20 text-orange-400" :
                    "bg-red-500/20 text-red-400"
                  }`}>
                    {difficultyLevel.charAt(0).toUpperCase() + difficultyLevel.slice(1)}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Current Difficulty: {difficultyLevel} {scenarioInfo.difficulty !== difficultyLevel ? `(auto-adjusted)` : ""}
                </p>
              </div>
            )}

            {/* Messages */}
            <div className="border rounded-xl p-4 h-[480px] overflow-y-auto space-y-3 bg-zinc-900/40">
          {messages.length === 0 && (
            <p className="text-sm text-zinc-400">
              Start by telling the coach what you want to practice, e.g.
              &quot;Let&apos;s roleplay a customer buying an SUV who thinks the
              price is too high.&quot;
            </p>
          )}
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`max-w-[70%] rounded-lg p-3 text-sm ${
                m.role === "user"
                  ? "ml-auto bg-violet-600 text-white"
                  : m.role === "coach"
                  ? "bg-amber-900/40 border border-amber-700/40"
                  : "bg-zinc-800"
              }`}
            >
              <div className="font-semibold mb-1 text-xs">
                {m.role === "user"
                  ? "You"
                  : m.role === "coach"
                  ? "Coach"
                  : "Customer"}
              </div>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-zinc-800 rounded-lg px-3 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-sm bg-zinc-900 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                placeholder={
                  sessionEnded
                    ? "Session ended. Start a new one by typing here..."
                    : "Type your next line as the salesperson..."
                }
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (sessionEnded) setSessionEnded(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendTurn(false);
                  }
                }}
                disabled={loading}
              />
              <button
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onClick={() => sendTurn(false)}
                disabled={loading || !input.trim()}
              >
                {loading ? "Thinking..." : "Send"}
              </button>
              <button
                className="px-3 py-2 rounded-lg border border-zinc-700 text-sm hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onClick={() => sendTurn(true)}
                disabled={loading || messages.length === 0}
              >
                End & Save
              </button>
            </div>
          </div>

          {/* v2.5: Feedback Panel */}
          <div className="lg:col-span-1">
            {feedback && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-4 sticky top-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Target className="w-4 h-4 text-amber-400" />
                    Performance Feedback
                  </h3>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-amber-400">{feedback.confidenceScore}</div>
                    <div className="text-xs text-zinc-500">/ 100</div>
                  </div>
                </div>

                {/* What Went Well */}
                {feedback.whatWentWell.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <h4 className="text-sm font-medium text-green-400">What You Did Well</h4>
                    </div>
                    <ul className="space-y-1">
                      {feedback.whatWentWell.map((item, idx) => (
                        <li key={idx} className="text-xs text-zinc-300 pl-6">• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* What To Improve */}
                {feedback.whatToImprove.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-orange-400" />
                      <h4 className="text-sm font-medium text-orange-400">What To Improve</h4>
                    </div>
                    <ul className="space-y-1">
                      {feedback.whatToImprove.map((item, idx) => (
                        <li key={idx} className="text-xs text-zinc-300 pl-6">• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggested Drills */}
                {feedback.suggestedDrills.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-violet-400" />
                      <h4 className="text-sm font-medium text-violet-400">Suggested Drills</h4>
                    </div>
                    <ul className="space-y-1">
                      {feedback.suggestedDrills.map((item, idx) => (
                        <li key={idx} className="text-xs text-zinc-300 pl-6">• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Placeholder when no feedback */}
            {!feedback && !loading && messages.length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center text-zinc-500 text-sm">
                Feedback will appear here after a few exchanges
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

