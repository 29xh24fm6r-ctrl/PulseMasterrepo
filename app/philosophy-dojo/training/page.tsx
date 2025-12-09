"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Play,
  CheckCircle,
  Send,
  RefreshCw,
  Zap,
  User,
  Shield,
  Swords,
  ChevronDown,
  Volume2,
} from "lucide-react";

// Types
type PhilosophyId = "stoicism" | "samurai" | "taoism" | "zen" | "seven_habits" | "discipline" | "spartan" | "buddhism";
type BeltRank = "white" | "yellow" | "orange" | "green" | "blue" | "brown" | "black" | "master";
type TrainingStyle = "micro" | "scenario" | "drill" | "roleplay" | "challenge" | "boss" | "meditation" | "reflection";

interface TrainingUnit {
  id: string;
  title: string;
  philosophy: PhilosophyId;
  style: TrainingStyle;
  difficulty: number;
  instructions: string;
  promptForUser: string;
  mentorGuidance?: string;
  suggestedXpReward: number;
  tags: string[];
  estimatedMinutes: number;
}

interface Mentor {
  id: string;
  name: string;
  icon: string;
}

const PHILOSOPHIES = [
  { id: "stoicism", name: "Stoicism", icon: "🏛️", color: "#6366f1" },
  { id: "samurai", name: "Samurai", icon: "⚔️", color: "#dc2626" },
  { id: "taoism", name: "Taoism", icon: "☯️", color: "#059669" },
  { id: "zen", name: "Zen", icon: "🧘", color: "#0891b2" },
  { id: "discipline", name: "Discipline", icon: "💪", color: "#ea580c" },
];

const MENTORS: Mentor[] = [
  { id: "marcus_aurelius", name: "Marcus Aurelius", icon: "👑" },
  { id: "musashi", name: "Miyamoto Musashi", icon: "⚔️" },
  { id: "lao_tzu", name: "Lao Tzu", icon: "☯️" },
  { id: "zen_master", name: "Zen Master", icon: "🧘" },
  { id: "goggins", name: "David Goggins", icon: "💀" },
];

const BELT_COLORS: Record<BeltRank, string> = {
  white: "#f4f4f5",
  yellow: "#fbbf24",
  orange: "#f97316",
  green: "#22c55e",
  blue: "#3b82f6",
  brown: "#92400e",
  black: "#18181b",
  master: "#a855f7",
};

function TrainingContent() {
  const searchParams = useSearchParams();
  const initialPhilosophy = (searchParams.get("philosophy") as PhilosophyId) || "stoicism";
  
  const [step, setStep] = useState<"setup" | "training" | "complete">("setup");
  const [loading, setLoading] = useState(false);
  const [training, setTraining] = useState<TrainingUnit | null>(null);
  const [response, setResponse] = useState("");
  const [xpAwarded, setXpAwarded] = useState(0);

  // Setup state
  const [philosophy, setPhilosophy] = useState<PhilosophyId>(initialPhilosophy);
  const [belt, setBelt] = useState<BeltRank>("white");
  const [style, setStyle] = useState<TrainingStyle | "auto">("auto");
  const [mentor, setMentor] = useState<string>("");
  const [crossPhilosophy, setCrossPhilosophy] = useState<PhilosophyId | "">("");
  const [softMode, setSoftMode] = useState(false);

  const responseRef = useRef<HTMLTextAreaElement>(null);

  // Load belt from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("pulse_philosophy_progress");
    if (saved) {
      const progress = JSON.parse(saved);
      if (progress[philosophy]) {
        setBelt(progress[philosophy].currentBelt || "white");
      }
    }
  }, [philosophy]);

  async function startTraining() {
    setLoading(true);
    try {
      const res = await fetch("/api/philosophy/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          philosophy,
          belt,
          style,
          mentorId: mentor || undefined,
          crossPhilosophyWith: crossPhilosophy || undefined,
          userProfile: softMode ? {
            wantsSoftTraining: true,
            anxietyLevel: 3,
            socialConfidence: 3,
            prefersShortTurns: false,
          } : undefined,
        }),
      });
      const data: TrainingUnit = await res.json();
      setTraining(data);
      setStep("training");
    } catch (err) {
      console.error("Failed to generate training:", err);
    } finally {
      setLoading(false);
    }
  }

  async function submitResponse() {
    if (!training || !response.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/philosophy/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          userId: "default_user",
          trainingUnit: training,
          userResponse: response,
          evaluation: {
            score: 8, // TODO: AI evaluation
            feedback: "Well done!",
          },
        }),
      });
      const data = await res.json();
      setXpAwarded(data.xpAwarded);

      // Update localStorage
      const saved = localStorage.getItem("pulse_philosophy_progress");
      const progress = saved ? JSON.parse(saved) : {};
      progress[training.philosophy] = {
        philosophyId: training.philosophy,
        totalXp: data.newTotalXp,
        currentBelt: data.currentBelt,
        trainingSessions: data.trainingSessions,
        skillLevels: {},
      };
      localStorage.setItem("pulse_philosophy_progress", JSON.stringify(progress));

      setStep("complete");
    } catch (err) {
      console.error("Failed to complete training:", err);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("setup");
    setTraining(null);
    setResponse("");
    setXpAwarded(0);
  }

  function speakInstructions() {
    if (!training) return;
    const utterance = new SpeechSynthesisUtterance(training.instructions);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  // ============================================
  // SETUP STEP
  // ============================================
  if (step === "setup") {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link href="/philosophy-dojo" className="p-2 hover:bg-zinc-800 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Swords className="w-6 h-6 text-violet-400" />
                Training Session
              </h1>
              <p className="text-sm text-zinc-500">Configure your practice</p>
            </div>
          </div>

          {/* Philosophy Selection */}
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-5">
            <h2 className="font-semibold mb-3">Choose Philosophy</h2>
            <div className="grid grid-cols-5 gap-2">
              {PHILOSOPHIES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPhilosophy(p.id as PhilosophyId)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    philosophy === p.id
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  <span className="text-2xl">{p.icon}</span>
                  <div className="text-xs mt-1">{p.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Training Style */}
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-5">
            <h2 className="font-semibold mb-3">Training Style</h2>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "auto", label: "Auto", icon: "✨" },
                { id: "micro", label: "Micro", icon: "⚡" },
                { id: "drill", label: "Drill", icon: "🎯" },
                { id: "scenario", label: "Scenario", icon: "🎭" },
                { id: "reflection", label: "Reflect", icon: "📝" },
                { id: "meditation", label: "Meditate", icon: "🧘" },
                { id: "roleplay", label: "Roleplay", icon: "🥊" },
                { id: "challenge", label: "Challenge", icon: "🔥" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id as any)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    style === s.id
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  <span className="text-xl">{s.icon}</span>
                  <div className="text-xs mt-1">{s.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Belt Level */}
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-5">
            <h2 className="font-semibold mb-3">Your Belt Level</h2>
            <div className="flex gap-2 flex-wrap">
              {(["white", "yellow", "orange", "green", "blue", "brown", "black"] as BeltRank[]).map((b) => (
                <button
                  key={b}
                  onClick={() => setBelt(b)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                    belt === b
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full border border-zinc-600"
                    style={{ backgroundColor: BELT_COLORS[b] }}
                  />
                  <span className="text-sm capitalize">{b}</span>
                </button>
              ))}
            </div>
          </div>

          {/* AI Mentor (Optional) */}
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              AI Mentor (Optional)
            </h2>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setMentor("")}
                className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                  !mentor ? "border-violet-500 bg-violet-500/10" : "border-zinc-700 hover:border-zinc-600"
                }`}
              >
                None
              </button>
              {MENTORS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMentor(m.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                    mentor === m.id
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  <span>{m.icon}</span>
                  <span>{m.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cross-Philosophy (Optional) */}
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-5">
            <h2 className="font-semibold mb-3">Hybrid Training (Optional)</h2>
            <p className="text-xs text-zinc-500 mb-3">Combine with another philosophy for advanced practice</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setCrossPhilosophy("")}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  !crossPhilosophy ? "border-violet-500 bg-violet-500/10" : "border-zinc-700"
                }`}
              >
                None
              </button>
              {PHILOSOPHIES.filter((p) => p.id !== philosophy).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setCrossPhilosophy(p.id as PhilosophyId)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                    crossPhilosophy === p.id
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Soft Mode Toggle */}
          <label className="flex items-center gap-3 px-4 py-3 bg-zinc-900/80 rounded-xl border border-zinc-800">
            <input
              type="checkbox"
              checked={softMode}
              onChange={(e) => setSoftMode(e.target.checked)}
              className="rounded"
            />
            <div>
              <span className="text-sm font-medium">Gentle Training Mode</span>
              <p className="text-xs text-zinc-500">More encouraging, less intense</p>
            </div>
          </label>

          {/* Start Button */}
          <button
            onClick={startTraining}
            disabled={loading}
            className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl font-medium text-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Begin Training
              </>
            )}
          </button>
        </div>
      </main>
    );
  }

  // ============================================
  // TRAINING STEP
  // ============================================
  if (step === "training" && training) {
    const phil = PHILOSOPHIES.find((p) => p.id === training.philosophy);

    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button onClick={reset} className="p-2 hover:bg-zinc-800 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{phil?.icon}</span>
              <span className="font-medium">{phil?.name}</span>
              <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs">
                {training.style.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Zap className="w-4 h-4 text-amber-400" />
              +{training.suggestedXpReward} XP
            </div>
          </div>

          {/* Training Card */}
          <div
            className="bg-gradient-to-br rounded-2xl border p-6"
            style={{
              borderColor: `${phil?.color}40`,
              background: `linear-gradient(135deg, ${phil?.color}10, transparent)`,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{training.title}</h2>
              <button
                onClick={speakInstructions}
                className="p-2 hover:bg-zinc-800 rounded-lg"
                title="Listen"
              >
                <Volume2 className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <div className="prose prose-invert prose-sm max-w-none">
              {training.instructions.split("\n\n").map((para, i) => (
                <p key={i} className="text-zinc-300 leading-relaxed mb-4">
                  {para}
                </p>
              ))}
            </div>

            {training.mentorGuidance && (
              <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <p className="text-sm text-amber-200 italic">
                  "{training.mentorGuidance}"
                </p>
              </div>
            )}
          </div>

          {/* Response Area */}
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-5">
            <h3 className="font-semibold mb-2">{training.promptForUser}</h3>
            <textarea
              ref={responseRef}
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Write your response here..."
              className="w-full h-40 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm resize-none focus:outline-none focus:border-violet-500"
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={submitResponse}
                disabled={loading || !response.trim()}
                className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl font-medium flex items-center justify-center gap-2"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Response
                  </>
                )}
              </button>
              <button
                onClick={reset}
                className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium"
              >
                Skip
              </button>
            </div>
          </div>

          {/* Tags */}
          <div className="flex gap-2 flex-wrap">
            {training.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-zinc-800 rounded-full text-xs text-zinc-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ============================================
  // COMPLETE STEP
  // ============================================
  if (step === "complete") {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>

          <h1 className="text-2xl font-bold">Training Complete!</h1>
          <p className="text-zinc-400">You've completed the exercise. Well done, practitioner.</p>

          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-6">
            <div className="flex items-center justify-center gap-3 text-2xl font-bold text-amber-400">
              <Zap className="w-8 h-8" />
              +{xpAwarded} XP
            </div>
            <p className="text-sm text-zinc-500 mt-2">
              Keep training to level up your belt!
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium"
            >
              Train Again
            </button>
            <Link
              href="/philosophy-dojo"
              className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium text-center"
            >
              Back to Dojo
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return null;
}

export default function TrainingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <RefreshCw className="w-8 h-8 animate-spin text-violet-400" />
    </div>}>
      <TrainingContent />
    </Suspense>
  );
}
