// Connect / Dashboard Preferences
// app/(authenticated)/onboarding/connect/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const DASHBOARD_OPTIONS = [
  { key: "show_tasks_focus", label: "Show today's tasks & focus" },
  { key: "show_money_snapshot", label: "Show a simple money snapshot" },
  { key: "show_relationships", label: "Show relationships & deals" },
  { key: "show_strategy_xp", label: "Show my strategy & XP" },
  { key: "show_energy_mood", label: "Show energy & mood" },
];

export default function ConnectPage() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<Record<string, boolean>>({
    show_tasks_focus: true,
    show_money_snapshot: true,
    show_relationships: true,
    show_strategy_xp: true,
    show_energy_mood: true,
  });

  function togglePreference(key: string) {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  async function handleNext() {
    try {
      await fetch("/api/onboarding/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });
      router.push("/onboarding/tour");
    } catch (err) {
      console.error("Failed to save preferences:", err);
    }
  }

  async function handleSkip() {
    // Use defaults (all true)
    try {
      await fetch("/api/onboarding/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          show_tasks_focus: true,
          show_money_snapshot: true,
          show_relationships: true,
          show_strategy_xp: true,
          show_energy_mood: true,
        }),
      });
      router.push("/onboarding/tour");
    } catch (err) {
      console.error("Failed to save preferences:", err);
    }
  }

  return (
    <div className="min-h-screen p-4 py-12 md:py-16">
      <div className="max-w-2xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Set Up Your Home Base
          </h1>
          <p className="text-zinc-400">
            Choose what you want to see on your Life dashboard. You can change this anytime in Settings.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {DASHBOARD_OPTIONS.map((option, index) => (
            <motion.div
              key={option.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="flex items-center gap-3 p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors"
            >
              <Checkbox
                checked={preferences[option.key]}
                onCheckedChange={() => togglePreference(option.key)}
                className="border-zinc-700"
              />
              <label className="text-sm font-medium text-white cursor-pointer flex-1">
                {option.label}
              </label>
            </motion.div>
          ))}
        </motion.div>

        <div className="flex justify-between items-center pt-4">
          <Button
            onClick={handleSkip}
            variant="ghost"
            className="text-zinc-400 hover:text-zinc-300"
          >
            Skip (use defaults)
          </Button>
          <Button
            onClick={handleNext}
            size="lg"
            className="bg-violet-600 hover:bg-violet-700"
          >
            Build My Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}




