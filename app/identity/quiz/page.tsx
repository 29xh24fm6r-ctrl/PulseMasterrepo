"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Compass,
  Star,
  Zap,
} from "lucide-react";
import {
  QUIZ_QUESTIONS,
  calculateQuizResults,
  quizResultsToResonance,
  QuizResults,
} from "@/lib/identity/quiz";
import { ARCHETYPES, CORE_VALUES, createInitialIdentityState } from "@/lib/identity/types";

const STORAGE_KEY = "pulse-identity-state";

type Phase = "intro" | "quiz" | "results";

export default function IdentityQuizPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<QuizResults | null>(null);
  const [saving, setSaving] = useState(false);

  const totalQuestions = QUIZ_QUESTIONS.length;
  const progress = (currentQuestion / totalQuestions) * 100;

  function handleAnswer(optionId: string) {
    const question = QUIZ_QUESTIONS[currentQuestion];
    setAnswers((prev) => ({ ...prev, [question.id]: optionId }));

    // Auto-advance after short delay
    setTimeout(() => {
      if (currentQuestion < totalQuestions - 1) {
        setCurrentQuestion((prev) => prev + 1);
      } else {
        // Calculate results
        const quizResults = calculateQuizResults({
          ...answers,
          [question.id]: optionId,
        });
        setResults(quizResults);
        setPhase("results");
      }
    }, 300);
  }

  function handleBack() {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  }

  async function handleSaveAndContinue() {
    if (!results) return;

    setSaving(true);
    try {
      // Get current state or create new one
      const saved = localStorage.getItem(STORAGE_KEY);
      const state = saved ? JSON.parse(saved) : createInitialIdentityState();

      // Apply quiz results
      const { resonance, values } = quizResultsToResonance(results);

      // Merge resonance (keep higher values if already set)
      for (const [id, score] of Object.entries(resonance)) {
        const current = state.resonance[id]?.current || 0;
        state.resonance[id] = {
          ...state.resonance[id],
          current: Math.max(current, score),
          peak: Math.max(state.resonance[id]?.peak || 0, score),
          trend: "rising",
        };
      }

      // Merge values
      for (const [id, score] of Object.entries(values)) {
        const current = state.values[id]?.score || 50;
        state.values[id] = {
          ...state.values[id],
          score: Math.max(current, score),
          trend: "rising",
        };
      }

      // Mark quiz as completed
      state.quizCompleted = true;
      state.quizCompletedAt = new Date().toISOString();

      // Save
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      // Navigate to dashboard
      router.push("/bridge");
    } catch (err) {
      console.error("Failed to save quiz results:", err);
    } finally {
      setSaving(false);
    }
  }

  // Intro phase
  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
        {/* Ambient background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-[128px]" />
        </div>

        <div className="relative z-10 max-w-lg text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Compass className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-3xl font-bold mb-4">Discover Your Identity</h1>
          <p className="text-zinc-400 mb-8">
            Answer {totalQuestions} questions to uncover your core archetypes and values.
            This will personalize your Pulse OS experience and unlock identity-aligned XP bonuses.
          </p>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => setPhase("quiz")}
              className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all"
            >
              Begin Discovery
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => router.push("/bridge")}
              className="text-zinc-500 hover:text-zinc-300 text-sm"
            >
              Skip for now
            </button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              {totalQuestions} questions
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              ~3 minutes
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Results phase
  if (phase === "results" && results) {
    const primaryArch = ARCHETYPES[results.primaryArchetype];
    const secondaryArch = ARCHETYPES[results.topArchetypes[1]?.id];
    const tertiaryArch = ARCHETYPES[results.topArchetypes[2]?.id];

    const primaryValue = CORE_VALUES[results.primaryValue];
    const secondaryValue = CORE_VALUES[results.topValues[1]?.id];
    const tertiaryValue = CORE_VALUES[results.topValues[2]?.id];

    return (
      <div className="min-h-screen bg-zinc-950 text-white p-4">
        {/* Ambient background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[128px]"
            style={{ backgroundColor: `${primaryArch?.color}30` }}
          />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-[128px]" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto py-12">
          {/* Success header */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Identity Discovered</h1>
            <p className="text-zinc-400">Your unique archetypal blueprint</p>
          </div>

          {/* Primary Archetype */}
          <div className="mb-8">
            <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Primary Archetype</div>
            <div
              className="p-6 rounded-2xl border-2 relative overflow-hidden"
              style={{
                backgroundColor: `${primaryArch?.color}10`,
                borderColor: `${primaryArch?.color}50`,
              }}
            >
              <div className="flex items-center gap-4">
                <div className="text-5xl">{primaryArch?.icon}</div>
                <div className="flex-1">
                  <div
                    className="text-2xl font-bold"
                    style={{ color: primaryArch?.color }}
                  >
                    The {primaryArch?.name}
                  </div>
                  <p className="text-zinc-400 mt-1">{primaryArch?.description}</p>
                </div>
              </div>
              <div className="absolute top-2 right-2 px-2 py-1 bg-zinc-900/80 rounded-full text-xs text-zinc-400">
                {results.topArchetypes[0]?.score} pts
              </div>
            </div>
          </div>

          {/* Secondary Archetypes */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {[secondaryArch, tertiaryArch].map((arch, i) => {
              if (!arch) return null;
              const score = results.topArchetypes[i + 1]?.score || 0;
              return (
                <div
                  key={arch.id}
                  className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{arch.icon}</span>
                    <div>
                      <div className="font-medium" style={{ color: arch.color }}>
                        {arch.name}
                      </div>
                      <div className="text-xs text-zinc-500">{score} pts</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Core Values */}
          <div className="mb-8">
            <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Core Values</div>
            <div className="flex flex-wrap gap-3">
              {[primaryValue, secondaryValue, tertiaryValue].map((value, i) => {
                if (!value) return null;
                const score = results.topValues[i]?.score || 0;
                return (
                  <div
                    key={value.id}
                    className={`
                      px-4 py-2 rounded-xl flex items-center gap-2
                      ${i === 0 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-zinc-800 text-zinc-300"}
                    `}
                  >
                    <span>{value.icon}</span>
                    <span className="font-medium">{value.name}</span>
                    <span className="text-xs opacity-60">+{score}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* XP Bonus Preview */}
          <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/30 mb-8">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <div>
                <div className="font-medium text-violet-400">Identity XP Bonus Unlocked</div>
                <p className="text-sm text-zinc-400 mt-0.5">
                  Reach 500 resonance with {primaryArch?.name} to activate +25%{" "}
                  {primaryArch?.xpBonus?.category} XP
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleSaveAndContinue}
              disabled={saving}
              className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue to Dashboard
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
            <button
              onClick={() => {
                setPhase("quiz");
                setCurrentQuestion(0);
                setAnswers({});
                setResults(null);
              }}
              className="text-zinc-500 hover:text-zinc-300 text-sm"
            >
              Retake quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz phase
  const question = QUIZ_QUESTIONS[currentQuestion];
  const selectedAnswer = answers[question.id];

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-zinc-800 z-50">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={currentQuestion === 0}
          className="p-2 rounded-lg hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-sm text-zinc-500">
          {currentQuestion + 1} of {totalQuestions}
        </div>
        <div className="w-9" /> {/* Spacer */}
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-lg w-full">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-center mb-2">{question.text}</h2>
            {question.subtext && (
              <p className="text-zinc-500 text-center">{question.subtext}</p>
            )}
          </div>

          {/* Options */}
          <div className="space-y-3">
            {question.options.map((option) => {
              const isSelected = selectedAnswer === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => handleAnswer(option.id)}
                  className={`
                    w-full p-4 rounded-xl text-left transition-all
                    ${isSelected
                      ? "bg-violet-600 border-violet-500 scale-[1.02]"
                      : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50"
                    }
                    border-2
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center
                        ${isSelected ? "border-white bg-white" : "border-zinc-600"}
                      `}
                    >
                      {isSelected && <Check className="w-4 h-4 text-violet-600" />}
                    </div>
                    <span className={isSelected ? "text-white" : "text-zinc-300"}>
                      {option.text}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="p-4 text-center text-xs text-zinc-600">
        Choose the answer that resonates most with you
      </div>
    </div>
  );
}
