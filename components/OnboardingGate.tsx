"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface OnboardingGateProps {
  children: React.ReactNode;
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    checkOnboarding();
  }, []);

  async function checkOnboarding() {
    try {
      // Check if user has skipped onboarding
      const skipped = localStorage.getItem("pulse_onboarding_skipped");
      if (skipped === "true") {
        setReady(true);
        setChecking(false);
        return;
      }

      const res = await fetch("/api/onboarding/status");
      if (!res.ok) {
        setReady(true);
        setChecking(false);
        return;
      }
      
      const data = await res.json();
      
      if (!data.completed) {
        // Show prompt instead of forcing redirect
        setShowPrompt(true);
        setChecking(false);
        return;
      }
      
      setReady(true);
    } catch (e) {
      setReady(true);
    } finally {
      setChecking(false);
    }
  }

  function handleStartOnboarding() {
    router.push("/onboarding");
  }

  function handleSkip() {
    localStorage.setItem("pulse_onboarding_skipped", "true");
    setShowPrompt(false);
    setReady(true);
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
          <p className="text-zinc-400">Loading your Pulse...</p>
        </div>
      </div>
    );
  }

  if (showPrompt) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <span className="text-3xl">✨</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">
            Welcome to Pulse
          </h1>
          <p className="text-zinc-400 mb-6">
            Take 2 minutes to personalize your dashboard, or jump straight in with the default setup.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleStartOnboarding}
              className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium rounded-xl transition-all"
            >
              ✨ Personalize My Dashboard
            </button>
            <button
              onClick={handleSkip}
              className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-all"
            >
              Skip for Now
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-4">
            You can personalize later in Settings
          </p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}