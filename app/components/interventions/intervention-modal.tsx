// Intervention Modal Component
// app/components/interventions/intervention-modal.tsx

"use client";

import { useState } from "react";
import { X, Play, CheckCircle2 } from "lucide-react";

interface InterventionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intervention: {
    key: string;
    label: string;
    description?: string;
    estimatedDurationSeconds?: number;
  } | null;
  script?: string;
  onComplete: () => void;
}

export function InterventionModal({
  open,
  onOpenChange,
  intervention,
  script,
  onComplete,
}: InterventionModalProps) {
  const [step, setStep] = useState<"intro" | "active" | "complete">("intro");
  const [countdown, setCountdown] = useState(0);

  if (!open || !intervention) return null;

  function handleStart() {
    setStep("active");
    if (intervention?.estimatedDurationSeconds) {
      setCountdown(intervention.estimatedDurationSeconds);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setStep("complete");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // No countdown, user marks as done
      setTimeout(() => setStep("complete"), 2000);
    }
  }

  function handleComplete() {
    onComplete();
    setStep("intro");
    setCountdown(0);
    onOpenChange(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full mx-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{intervention.label}</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === "intro" && (
          <>
            {intervention.description && (
              <p className="text-sm text-zinc-300">{intervention.description}</p>
            )}
            {intervention.estimatedDurationSeconds && (
              <p className="text-xs text-zinc-400">
                Estimated duration: {Math.ceil(intervention.estimatedDurationSeconds / 60)} minutes
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleStart}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Play className="w-4 h-4" />
                Start
              </button>
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                Skip
              </button>
            </div>
          </>
        )}

        {step === "active" && (
          <>
            {script && (
              <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-zinc-200 whitespace-pre-line">{script}</p>
              </div>
            )}
            {countdown > 0 && (
              <div className="text-center">
                <div className="text-3xl font-bold text-violet-400">{countdown}s</div>
              </div>
            )}
            <button
              onClick={() => setStep("complete")}
              className="w-full bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Mark as Complete
            </button>
          </>
        )}

        {step === "complete" && (
          <>
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
              <p className="text-sm text-zinc-300 text-center">
                Great job completing this intervention!
              </p>
            </div>
            <button
              onClick={handleComplete}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}

