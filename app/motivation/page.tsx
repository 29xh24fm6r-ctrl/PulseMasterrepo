"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Send,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Zap,
  ChevronDown,
  User,
  Flame,
  Target,
  RefreshCw,
  Play,
  CheckCircle,
} from "lucide-react";

interface MotivationResponse {
  personas: string[];
  intensity: "low" | "medium" | "high";
  message: string;
  microAction: string;
  motivationEventId: string;
}

const PERSONA_DISPLAY_NAMES: Record<string, string> = {
  goggins: "David Goggins",
  jocko: "Jocko Willink",
  robbins: "Tony Robbins",
  aurelius: "Marcus Aurelius",
  tolle: "Eckhart Tolle",
  jordan: "Michael Jordan",
  kobe: "Kobe Bryant",
  jobs: "Steve Jobs",
  churchill: "Winston Churchill",
  mlk: "Martin Luther King Jr.",
  mandela: "Nelson Mandela",
  seneca: "Seneca",
  buddha: "Buddha",
  musashi: "Miyamoto Musashi",
  james_clear: "James Clear",
  mel_robbins: "Mel Robbins",
  holiday: "Ryan Holiday",
  frankl: "Viktor Frankl",
  peterson: "Jordan Peterson",
  brene_brown: "Brené Brown",
};

const QUICK_PROMPTS = [
  { icon: "😩", label: "I can't get started", text: "I'm stuck and can't seem to get started on anything today" },
  { icon: "😰", label: "Feeling overwhelmed", text: "I'm overwhelmed and don't know where to begin" },
  { icon: "😔", label: "Lost motivation", text: "I've lost my motivation and feel stuck" },
  { icon: "😤", label: "Frustrated", text: "I'm frustrated and nothing seems to be working" },
  { icon: "😴", label: "No energy", text: "I have no energy and feel exhausted" },
  { icon: "🤔", label: "Need direction", text: "I need clarity on what to focus on next" },
  { icon: "😨", label: "Scared to start", text: "I'm scared to take the next step" },
  { icon: "😞", label: "Failed again", text: "I failed again and feel like giving up" },
];

export default function MotivationPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<MotivationResponse | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<MotivationResponse[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [actionCompleted, setActionCompleted] = useState(false);
  const [prefersGentle, setPrefersGentle] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function getMotivation(text?: string) {
    const prompt = text || input.trim();
    if (!prompt) return;

    setLoading(true);
    setResponse(null);
    setFeedbackGiven(false);
    setActionCompleted(false);

    try {
      const res = await fetch("/api/motivation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request",
          rawText: prompt,
          context: {
            source: "text",
            prefersGentle,
          },
        }),
      });

      const data: MotivationResponse = await res.json();
      setResponse(data);
      setHistory((prev) => [data, ...prev].slice(0, 10));
      setInput("");
    } catch (err) {
      console.error("Failed to get motivation:", err);
    } finally {
      setLoading(false);
    }
  }

  async function sendFeedback(feedback: "better" | "same" | "worse") {
    if (!response || feedbackGiven) return;

    try {
      await fetch("/api/motivation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "xp-callback",
          motivationEventId: response.motivationEventId,
          actionTaken: actionCompleted,
          userFeedback: feedback,
        }),
      });
      setFeedbackGiven(true);
    } catch (err) {
      console.error("Failed to send feedback:", err);
    }
  }

  function speakMessage() {
    if (!response) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(response.message);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      getMotivation();
    }
  }

  const intensityColors = {
    low: "text-emerald-400 bg-emerald-500/10",
    medium: "text-amber-400 bg-amber-500/10",
    high: "text-red-400 bg-red-500/10",
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-zinc-800 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Flame className="w-6 h-6 text-orange-400" />
              Motivational Coach
            </h1>
            <p className="text-sm text-zinc-500">60+ legendary voices to inspire you</p>
          </div>
          <button
            onClick={() => setPrefersGentle(!prefersGentle)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              prefersGentle
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {prefersGentle ? "🌱 Gentle Mode" : "⚡ Standard Mode"}
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Quick Prompts */}
        {!response && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-500">What's on your mind?</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt.label}
                  onClick={() => getMotivation(prompt.text)}
                  disabled={loading}
                  className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-left hover:border-zinc-700 transition-colors disabled:opacity-50"
                >
                  <span className="text-xl">{prompt.icon}</span>
                  <div className="text-xs text-zinc-400 mt-1">{prompt.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Input */}
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell me what you're feeling or struggling with..."
            className="w-full px-4 py-3 pr-12 bg-zinc-900/80 border border-zinc-800 rounded-xl text-sm resize-none focus:outline-none focus:border-orange-500/50"
            rows={3}
            disabled={loading}
          />
          <button
            onClick={() => getMotivation()}
            disabled={loading || !input.trim()}
            className="absolute right-3 bottom-3 p-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-8 text-center">
            <Flame className="w-12 h-12 text-orange-400 mx-auto mb-3 animate-pulse" />
            <p className="text-zinc-400">Finding the right voice for you...</p>
          </div>
        )}

        {/* Response */}
        {response && !loading && (
          <div className="space-y-4">
            {/* Persona Info */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-zinc-500" />
                <span className="text-sm text-zinc-400">
                  {response.personas
                    .map((p) => PERSONA_DISPLAY_NAMES[p] || p)
                    .join(" + ")}
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  intensityColors[response.intensity]
                }`}
              >
                {response.intensity.toUpperCase()} INTENSITY
              </span>
            </div>

            {/* Message Card */}
            <div className="bg-gradient-to-br from-orange-950/30 to-zinc-900 border border-orange-500/20 rounded-2xl p-6">
              <p className="text-lg leading-relaxed">{response.message}</p>

              {/* Audio Button */}
              <button
                onClick={speakMessage}
                className="mt-4 flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300"
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="w-4 h-4" />
                    Stop
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    Listen
                  </>
                )}
              </button>
            </div>

            {/* Micro Action */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-violet-400 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-violet-400 mb-1">
                    Your Micro-Action
                  </h3>
                  <p className="text-zinc-300">{response.microAction}</p>

                  <button
                    onClick={() => setActionCompleted(!actionCompleted)}
                    className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                      actionCompleted
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    }`}
                  >
                    {actionCompleted ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Done! +25 XP
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Mark as Done
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Feedback */}
            <div className="bg-zinc-900/50 rounded-xl p-4">
              <p className="text-sm text-zinc-500 mb-3">How do you feel now?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => sendFeedback("better")}
                  disabled={feedbackGiven}
                  className={`flex-1 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors ${
                    feedbackGiven
                      ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                      : "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  Better
                </button>
                <button
                  onClick={() => sendFeedback("same")}
                  disabled={feedbackGiven}
                  className={`flex-1 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors ${
                    feedbackGiven
                      ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                      : "bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  <Minus className="w-4 h-4" />
                  Same
                </button>
                <button
                  onClick={() => sendFeedback("worse")}
                  disabled={feedbackGiven}
                  className={`flex-1 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors ${
                    feedbackGiven
                      ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                      : "bg-red-600/20 text-red-400 hover:bg-red-600/30"
                  }`}
                >
                  <ThumbsDown className="w-4 h-4" />
                  Worse
                </button>
              </div>
              {feedbackGiven && (
                <p className="text-xs text-zinc-500 mt-2 text-center">
                  Thanks! This helps Pulse learn your preferences.
                </p>
              )}
            </div>

            {/* New Motivation Button */}
            <button
              onClick={() => {
                setResponse(null);
                inputRef.current?.focus();
              }}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Get Another Motivation
            </button>
          </div>
        )}

        {/* History Toggle */}
        {history.length > 0 && (
          <div className="border-t border-zinc-800 pt-4">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  showHistory ? "rotate-180" : ""
                }`}
              />
              Recent Sessions ({history.length})
            </button>

            {showHistory && (
              <div className="mt-3 space-y-2">
                {history.map((item, i) => (
                  <div
                    key={i}
                    className="p-3 bg-zinc-900/50 rounded-lg text-sm text-zinc-400"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-zinc-600">
                        {item.personas
                          .map((p) => PERSONA_DISPLAY_NAMES[p] || p)
                          .join(" + ")}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          intensityColors[item.intensity]
                        }`}
                      >
                        {item.intensity}
                      </span>
                    </div>
                    <p className="line-clamp-2">{item.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
