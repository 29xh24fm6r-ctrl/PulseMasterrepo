"use client";

/**
 * Beta Onboarding Flow
 * Quick 10-minute setup for new users
 * app/onboarding/page.tsx
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type OnboardingStep = "welcome" | "connect" | "import" | "complete";

export default function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [connecting, setConnecting] = useState(false);
  const [importing, setImporting] = useState(false);
  const router = useRouter();

  async function connectEmail() {
    setConnecting(true);
    try {
      // TODO: Trigger email/calendar OAuth flow
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStep("import");
    } catch (err) {
      console.error("Failed to connect email", err);
    } finally {
      setConnecting(false);
    }
  }

  async function skipImport() {
    setStep("complete");
  }

  async function completeOnboarding() {
    router.push("/home");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-8">
        {step === "welcome" && (
          <div className="text-center space-y-6">
            <h1 className="text-4xl font-bold">Welcome to Pulse</h1>
            <p className="text-xl text-zinc-400">
              Your Life OS. Let's get you set up in 10 minutes.
            </p>
            <button
              onClick={() => setStep("connect")}
              className="px-8 py-4 bg-gradient-to-r from-violet-600 to-pink-600 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity"
            >
              Get Started
            </button>
          </div>
        )}

        {step === "connect" && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">Connect Your Email & Calendar</h2>
            <p className="text-zinc-400">
              Pulse works best when connected to your email and calendar. We'll sync your meetings,
              contacts, and commitments.
            </p>
            <button
              onClick={connectEmail}
              disabled={connecting}
              className="w-full px-8 py-4 bg-violet-600 rounded-xl font-semibold hover:bg-violet-700 disabled:opacity-50"
            >
              {connecting ? "Connecting..." : "Connect Gmail & Google Calendar"}
            </button>
            <button
              onClick={() => setStep("import")}
              className="w-full px-8 py-4 border border-zinc-800 rounded-xl font-semibold hover:bg-zinc-900"
            >
              Skip for Now
            </button>
          </div>
        )}

        {step === "import" && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">Import Contacts (Optional)</h2>
            <p className="text-zinc-400">
              We can import your contacts from your email to get started faster.
            </p>
            <button
              onClick={() => {
                setImporting(true);
                setTimeout(() => {
                  setImporting(false);
                  setStep("complete");
                }, 2000);
              }}
              disabled={importing}
              className="w-full px-8 py-4 bg-violet-600 rounded-xl font-semibold hover:bg-violet-700 disabled:opacity-50"
            >
              {importing ? "Importing..." : "Import Contacts"}
            </button>
            <button
              onClick={skipImport}
              className="w-full px-8 py-4 border border-zinc-800 rounded-xl font-semibold hover:bg-zinc-900"
            >
              Skip
            </button>
          </div>
        )}

        {step === "complete" && (
          <div className="text-center space-y-6">
            <h2 className="text-3xl font-bold">You're All Set!</h2>
            <p className="text-xl text-zinc-400">
              Pulse is ready. Start by exploring your Home surface, or jump into Workspace to get
              things done.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/home"
                className="px-8 py-4 bg-gradient-to-r from-violet-600 to-pink-600 rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Open Home
              </Link>
              <Link
                href="/workspace"
                className="px-8 py-4 border border-zinc-800 rounded-xl font-semibold hover:bg-zinc-900"
              >
                Open Workspace
              </Link>
            </div>
            <Link
              href="/live-coach"
              className="block text-violet-400 hover:text-violet-300"
            >
              Or start Pulse Live for your next meeting →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
