// Welcome Screen - First Time Experience
// app/(authenticated)/onboarding/welcome/page.tsx

"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, Target, MessageSquare, Zap } from "lucide-react";

export default function WelcomePage() {
  const router = useRouter();

  async function handleGetStarted() {
    router.push("/onboarding/focus");
  }

  async function handleSkip() {
    // Mark onboarding as complete
    try {
      await fetch("/api/onboarding/complete-core", { method: "POST" });
    } catch (err) {
      console.error("Failed to mark onboarding complete:", err);
    }
    router.push("/life");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl text-center space-y-8"
      >
        <div className="space-y-4">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-block"
          >
            <Sparkles className="w-16 h-16 text-violet-500 mx-auto" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            Welcome to Pulse
          </h1>
          <p className="text-xl text-zinc-400 max-w-lg mx-auto">
            Your life, work, money, and momentum in one place.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"
          >
            <Target className="w-6 h-6 text-violet-400 mx-auto mb-2" />
            <p className="text-sm text-zinc-300">See your life at a glance</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"
          >
            <MessageSquare className="w-6 h-6 text-violet-400 mx-auto mb-2" />
            <p className="text-sm text-zinc-300">Talk to coaches who actually know your world</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"
          >
            <Zap className="w-6 h-6 text-violet-400 mx-auto mb-2" />
            <p className="text-sm text-zinc-300">Let Autopilot nudge what matters</p>
          </motion.div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            onClick={handleGetStarted}
            size="lg"
            className="bg-violet-600 hover:bg-violet-700 text-white px-8"
          >
            Get Started
          </Button>
          <Button
            onClick={handleSkip}
            variant="ghost"
            size="lg"
            className="text-zinc-400 hover:text-zinc-300"
          >
            Skip for now
          </Button>
        </div>
      </motion.div>
    </div>
  );
}




