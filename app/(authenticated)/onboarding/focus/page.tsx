// Focus Selection - What Season Are You In?
// app/(authenticated)/onboarding/focus/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Heart, TrendingUp, Zap, DollarSign, Users, Scale } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const FOCUS_OPTIONS = [
  { key: "healing", label: "Healing & Stability", icon: Heart, color: "rose" },
  { key: "career", label: "Career Growth", icon: TrendingUp, color: "blue" },
  { key: "performance", label: "Performance & Output", icon: Zap, color: "amber" },
  { key: "money", label: "Money & Finances", icon: DollarSign, color: "emerald" },
  { key: "relationships", label: "Relationships", icon: Users, color: "violet" },
  { key: "balance", label: "Balanced Life", icon: Scale, color: "sky" },
];

export default function FocusPage() {
  const router = useRouter();
  const [selectedFocus, setSelectedFocus] = useState<string[]>([]);
  const [selfDescription, setSelfDescription] = useState("");

  function toggleFocus(key: string) {
    setSelectedFocus((prev) => {
      if (prev.includes(key)) {
        return prev.filter((f) => f !== key);
      } else if (prev.length < 2) {
        return [...prev, key];
      } else {
        // Replace first if already 2 selected
        return [prev[1], key];
      }
    });
  }

  async function handleNext() {
    try {
      await fetch("/api/onboarding/focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryFocus: selectedFocus[0] || null,
          secondaryFocus: selectedFocus[1] || null,
          selfDescription: selfDescription || null,
        }),
      });
      router.push("/onboarding/connect");
    } catch (err) {
      console.error("Failed to save focus:", err);
    }
  }

  return (
    <div className="min-h-screen p-4 py-12 md:py-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            What matters most in this season of your life?
          </h1>
          <p className="text-zinc-400">
            Pick 1–2 areas. Pulse will tailor your experience around what you care about.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FOCUS_OPTIONS.map((option, index) => {
            const Icon = option.icon;
            const isSelected = selectedFocus.includes(option.key);
            const isPrimary = selectedFocus[0] === option.key;
            const isSecondary = selectedFocus[1] === option.key;

            return (
              <motion.button
                key={option.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => toggleFocus(option.key)}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? "border-violet-500 bg-violet-600/10"
                    : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                }`}
              >
                <Icon className={`w-8 h-8 mb-3 ${
                  isSelected ? "text-violet-400" : "text-zinc-500"
                }`} />
                <div className="text-lg font-semibold text-white mb-1">
                  {option.label}
                </div>
                {isPrimary && (
                  <div className="text-xs text-violet-400 mt-1">Primary focus</div>
                )}
                {isSecondary && (
                  <div className="text-xs text-violet-400 mt-1">Secondary focus</div>
                )}
              </motion.button>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <label className="text-sm font-medium text-zinc-300">
            Anything else you want Pulse to know about why you're here? (optional)
          </label>
          <Textarea
            value={selfDescription}
            onChange={(e) => setSelfDescription(e.target.value)}
            placeholder="I'm here because..."
            className="bg-zinc-900 border-zinc-800 text-white min-h-[100px]"
          />
        </motion.div>

        <div className="flex justify-end">
          <Button
            onClick={handleNext}
            disabled={selectedFocus.length === 0}
            size="lg"
            className="bg-violet-600 hover:bg-violet-700"
          >
            Next: Set Up Your Home Base
          </Button>
        </div>
      </div>
    </div>
  );
}




