"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingState {
  question: string;
  subtext?: string;
  options: string[];
  allowOther: boolean;
  allowMultiple: boolean;
  otherPlaceholder?: string;
  isComplete: boolean;
  profile?: any;
  questionNumber: number;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [otherText, setOtherText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startOnboarding();
  }, []);

  async function startOnboarding() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isStart: true }),
      });
      
      if (!res.ok) throw new Error("Failed to start");
      
      const data = await res.json();
      
      if (data.redirect) {
        router.push(data.redirect);
        return;
      }
      
      setState({
        question: data.question,
        subtext: data.subtext,
        options: data.options || [],
        allowOther: data.allowOther || false,
        allowMultiple: data.allowMultiple !== false,
        otherPlaceholder: data.otherPlaceholder,
        isComplete: data.isComplete || false,
        profile: data.profile,
        questionNumber: data.questionNumber || 1,
      });
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }

  function toggleOption(option: string) {
    const newSelected = new Set(selectedOptions);
    if (state?.allowMultiple) {
      if (newSelected.has(option)) {
        newSelected.delete(option);
      } else {
        newSelected.add(option);
      }
    } else {
      newSelected.clear();
      newSelected.add(option);
    }
    setSelectedOptions(newSelected);
    if (option !== "__other__") {
      setOtherText("");
    }
  }

  async function submitAnswer() {
    if (selectedOptions.size === 0 && !otherText) return;
    
    let answer: string;
    if (selectedOptions.has("__other__") && otherText) {
      const others = Array.from(selectedOptions).filter(o => o !== "__other__");
      answer = [...others, otherText].join(", ");
    } else if (state?.allowMultiple) {
      answer = Array.from(selectedOptions).join(", ");
    } else {
      answer = Array.from(selectedOptions)[0];
    }
    
    if (!answer) return;

    setSubmitting(true);
    setError(null);
    
    try {
      const res = await fetch("/api/onboarding/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      
      if (!res.ok) throw new Error("Failed to submit");
      
      const data = await res.json();
      
      setSelectedOptions(new Set());
      setOtherText("");
      
      if (data.isComplete) {
        setState(prev => ({
          ...prev!,
          isComplete: true,
          profile: data.profile,
        }));
        setShowProfile(true);
      } else {
        setState({
          question: data.question,
          subtext: data.subtext,
          options: data.options || [],
          allowOther: data.allowOther || false,
          allowMultiple: data.allowMultiple !== false,
          otherPlaceholder: data.otherPlaceholder,
          isComplete: false,
          questionNumber: data.questionNumber || (state?.questionNumber || 0) + 1,
        });
      }
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && selectedOptions.size > 0 && !submitting) {
      submitAnswer();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full"
            />
          </div>
          <p className="text-zinc-400">Preparing your experience...</p>
        </motion.div>
      </div>
    );
  }

  if (showProfile && state?.profile) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="text-center mb-8"
          >
            <div className="text-6xl mb-4">✨</div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome to Pulse</h1>
            <p className="text-zinc-400">We've built something just for you</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-3xl p-8 mb-8"
          >
            <div className="text-center mb-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="inline-block px-4 py-2 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 rounded-full mb-4"
              >
                <span className="text-violet-300 font-medium">{state.profile.archetype}</span>
              </motion.div>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-lg text-zinc-300 leading-relaxed"
              >
                {state.profile.summary}
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
            >
              <ProfileDetail icon="🎯" label="Your Dashboard" value={getDashboardDescription(state.profile)} />
              <ProfileDetail icon="🤝" label="Your Coach" value={getCoachDescription(state.profile)} />
              <ProfileDetail icon="⚡" label="Your Motivation" value={getMotivationDescription(state.profile)} />
            </motion.div>

            {state.profile.coachingFocus?.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="border-t border-zinc-800 pt-6"
              >
                <p className="text-sm text-zinc-500 mb-3">Pulse will help you with:</p>
                <div className="flex flex-wrap gap-2">
                  {state.profile.coachingFocus.map((focus: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-zinc-800 text-zinc-300 text-sm rounded-full">
                      {formatFocus(focus)}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="text-center">
            <button
              onClick={() => router.push("/")}
              className="px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-lg font-semibold rounded-2xl transition-all transform hover:scale-105 shadow-lg shadow-violet-500/25"
            >
              Enter Your Pulse Dashboard →
            </button>
            <p className="text-zinc-500 text-sm mt-4">You can always adjust your preferences in settings</p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  const hasSelection = selectedOptions.size > 0 || (selectedOptions.has("__other__") && otherText);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col" onKeyDown={handleKeyDown}>
      <div className="fixed top-0 left-0 right-0 h-1 bg-zinc-900 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min((state?.questionNumber || 1) / 22 * 100, 95)}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <header className="p-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <span className="text-white font-bold">P</span>
            </div>
            <div>
              <h1 className="text-white font-semibold">Pulse</h1>
              <p className="text-xs text-zinc-500">Getting to know you</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-500">Question {state?.questionNumber || 1}</span>
            <button
              onClick={async () => {
                if (confirm("Skip for now? You can always update your preferences later in settings.")) {
                  setSubmitting(true);
                  await fetch("/api/onboarding/skip", { method: "POST" });
                  router.push("/");
                }
              }}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={state?.questionNumber}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-8">
                <h2 className="text-2xl md:text-3xl font-semibold text-white mb-3 leading-relaxed">
                  {state?.question}
                </h2>
                {state?.subtext && <p className="text-zinc-400">{state.subtext}</p>}
                {state?.allowMultiple && (
                  <p className="text-sm text-violet-400 mt-2">Select all that apply</p>
                )}
              </div>

              <div className="space-y-3 mb-8">
                {state?.options.map((option, index) => {
                  const isSelected = selectedOptions.has(option);
                  return (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => toggleOption(option)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? "bg-violet-500/20 border-violet-500 text-white"
                          : "bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 ${state?.allowMultiple ? 'rounded-md' : 'rounded-full'} border-2 flex items-center justify-center transition-all ${
                            isSelected ? "border-violet-500 bg-violet-500" : "border-zinc-600"
                          }`}
                        >
                          {isSelected && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                              {state?.allowMultiple ? (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <div className="w-2 h-2 bg-white rounded-full" />
                              )}
                            </motion.div>
                          )}
                        </div>
                        <span>{option}</span>
                      </div>
                    </motion.button>
                  );
                })}

                {state?.allowOther && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (state?.options.length || 0) * 0.03 }}
                  >
                    <button
                      onClick={() => toggleOption("__other__")}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        selectedOptions.has("__other__")
                          ? "bg-violet-500/20 border-violet-500 text-white"
                          : "bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 ${state?.allowMultiple ? 'rounded-md' : 'rounded-full'} border-2 flex items-center justify-center transition-all ${
                            selectedOptions.has("__other__") ? "border-violet-500 bg-violet-500" : "border-zinc-600"
                          }`}
                        >
                          {selectedOptions.has("__other__") && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                              {state?.allowMultiple ? (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <div className="w-2 h-2 bg-white rounded-full" />
                              )}
                            </motion.div>
                          )}
                        </div>
                        <span>Other</span>
                      </div>
                    </button>
                    
                    {selectedOptions.has("__other__") && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3">
                        <input
                          type="text"
                          value={otherText}
                          onChange={(e) => setOtherText(e.target.value)}
                          placeholder={state?.otherPlaceholder || "Tell us more..."}
                          className="w-full p-4 bg-zinc-900 border-2 border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                          autoFocus
                        />
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </div>

              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
                  {error}
                </motion.div>
              )}

              <div className="flex justify-between items-center">
                {state?.allowMultiple && (
                  <span className="text-sm text-zinc-500">
                    {selectedOptions.size} selected
                  </span>
                )}
                <div className={!state?.allowMultiple ? 'ml-auto' : ''}>
                  <button
                    onClick={submitAnswer}
                    disabled={!hasSelection || submitting}
                    className={`px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                      hasSelection && !submitting
                        ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/25"
                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    }`}
                  >
                    {submitting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        />
                        Thinking...
                      </>
                    ) : (
                      <>
                        Continue
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function ProfileDetail({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-zinc-800/50 rounded-xl p-4">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm text-zinc-300">{value}</div>
    </div>
  );
}

function getDashboardDescription(profile: any): string {
  const density = profile.preferences?.dashboardDensity || 0.5;
  if (density < 0.3) return "Clean & minimal — just what matters";
  if (density < 0.6) return "Balanced — key info at a glance";
  return "Data-rich — full visibility";
}

function getCoachDescription(profile: any): string {
  const personality = profile.preferences?.coach?.personality || 'supportive_friend';
  const map: Record<string, string> = {
    'supportive_friend': 'Warm & encouraging',
    'wise_mentor': 'Calm & thoughtful',
    'strategic_advisor': 'Direct & efficient',
    'tough_coach': 'Push you hard',
    'accountability_partner': 'Keep you honest',
  };
  return map[personality] || 'Personalized to you';
}

function getMotivationDescription(profile: any): string {
  const gam = profile.preferences?.gamification;
  if (!gam) return "Balanced approach";
  if (gam.overall === 'love') return "XP, streaks & celebrations";
  if (gam.overall === 'dislike') return "Quiet progress tracking";
  if (gam.xp && gam.streaks) return "Progress tracking & streaks";
  if (gam.xp) return "XP system enabled";
  return "Subtle acknowledgments";
}

function formatFocus(focus: string): string {
  return focus.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
