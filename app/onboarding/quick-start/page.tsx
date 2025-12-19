"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  User,
  CheckSquare,
  BookOpen,
  Sparkles,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: "pending" | "in_progress" | "completed";
  action?: () => Promise<void>;
}

export default function QuickStartPage() {
  const router = useRouter();
  const [steps, setSteps] = useState<Step[]>([
    {
      id: "contact",
      title: "Create your first Contact",
      description: "Add someone from your network",
      icon: <User className="w-5 h-5" />,
      status: "pending",
    },
    {
      id: "task",
      title: "Create your first Task",
      description: "Add a task to your list",
      icon: <CheckSquare className="w-5 h-5" />,
      status: "pending",
    },
    {
      id: "journal",
      title: "Write your first Journal entry",
      description: "Record a thought or reflection",
      icon: <BookOpen className="w-5 h-5" />,
      status: "pending",
    },
    {
      id: "intel",
      title: "Run Intel Scan on a contact",
      description: "See Pulse gather intelligence",
      icon: <Sparkles className="w-5 h-5" />,
      status: "pending",
    },
    {
      id: "results",
      title: "View results in UI",
      description: "See your data come to life",
      icon: <CheckCircle2 className="w-5 h-5" />,
      status: "pending",
    },
  ]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  async function completeStep(stepIndex: number) {
    const step = steps[stepIndex];
    setLoading(true);

    try {
      // Mark current step as in progress
      setSteps((prev) =>
        prev.map((s, i) => (i === stepIndex ? { ...s, status: "in_progress" as const } : s))
      );

      switch (step.id) {
        case "contact":
          // Redirect to contacts creation
          router.push("/contacts/new?onboarding=true");
          return; // Don't mark complete yet, wait for redirect

        case "task":
          // Create a sample task via API
          const taskRes = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: "My first task",
              status: "pending",
            }),
          });
          if (taskRes.ok) {
            setSteps((prev) =>
              prev.map((s, i) => (i === stepIndex ? { ...s, status: "completed" as const } : s))
            );
            setCurrentStep(stepIndex + 1);
          }
          break;

        case "journal":
          // Redirect to journal
          router.push("/journal?onboarding=true");
          return;

        case "intel":
          // Enqueue an intel scan job (assuming we have a contact)
          const intelRes = await fetch("/api/intel/contact/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contact_id: null, // User will need to select one
            }),
          });
          if (intelRes.ok) {
            setSteps((prev) =>
              prev.map((s, i) => (i === stepIndex ? { ...s, status: "completed" as const } : s))
            );
            setCurrentStep(stepIndex + 1);
          }
          break;

        case "results":
          // Just mark as complete - user navigates to view results
          setSteps((prev) =>
            prev.map((s, i) => (i === stepIndex ? { ...s, status: "completed" as const } : s))
          );
          break;
      }
    } catch (err) {
      console.error("Failed to complete step:", err);
    } finally {
      setLoading(false);
    }
  }

  async function skipToNext() {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }

  const allCompleted = steps.every((s) => s.status === "completed");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Quick Start</h1>
          <p className="text-sm text-zinc-400 mt-2">
            Get Pulse up and running in 5 steps. This takes about 2 minutes.
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between text-sm text-zinc-400 mb-6">
          <span>
            Step {currentStep + 1} of {steps.length}
          </span>
          <span>
            {steps.filter((s) => s.status === "completed").length} completed
          </span>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, idx) => {
            const isCurrent = idx === currentStep;
            const isCompleted = step.status === "completed";
            const isPending = step.status === "pending";

            return (
              <div
                key={step.id}
                className={`p-6 rounded-lg border ${
                  isCurrent
                    ? "border-violet-600 bg-violet-900/20"
                    : isCompleted
                    ? "border-emerald-600 bg-emerald-900/10"
                    : "border-zinc-800 bg-zinc-900/50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    ) : isCurrent ? (
                      <Circle className="w-6 h-6 text-violet-400 fill-violet-400" />
                    ) : (
                      <Circle className="w-6 h-6 text-zinc-600" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-violet-400">{step.icon}</div>
                      <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                    </div>
                    <p className="text-sm text-zinc-400 mb-4">{step.description}</p>

                    {isCurrent && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => completeStep(idx)}
                          disabled={loading}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-800 text-white rounded-lg transition-colors"
                        >
                          {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              {step.id === "contact" || step.id === "journal"
                                ? "Go to page"
                                : "Complete"}
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                        {step.id !== "contact" && step.id !== "journal" && (
                          <button
                            onClick={skipToNext}
                            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                          >
                            Skip
                          </button>
                        )}
                      </div>
                    )}

                    {isCompleted && (
                      <div className="text-sm text-emerald-400">✓ Completed</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Completion Message */}
        {allCompleted && (
          <div className="rounded-lg border border-emerald-600 bg-emerald-900/20 p-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">You're all set!</h2>
            <p className="text-sm text-zinc-400 mb-4">
              Pulse is now configured and ready to use. Explore the Pulse Hub to discover more
              features.
            </p>
            <button
              onClick={() => router.push("/pulse")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
            >
              Go to Pulse Hub
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

