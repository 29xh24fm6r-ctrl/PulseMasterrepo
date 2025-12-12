// Tour Introduction Page
// app/(authenticated)/onboarding/tour/page.tsx

"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, Briefcase, DollarSign, Users, Compass } from "lucide-react";

const FEATURES = [
  { icon: Home, label: "Life", description: "Bird's-eye view of your current season." },
  { icon: Briefcase, label: "Work", description: "Today's focus, tasks, and Autopilot." },
  { icon: DollarSign, label: "Money", description: "Finances, budgets, alerts, and goals." },
  { icon: Users, label: "People", description: "Relationships, deals, and followups." },
];

export default function TourPage() {
  const router = useRouter();

  async function handleTakeTour() {
    // Mark tour as ready, then redirect to /life which will trigger the tour
    router.push("/life?tour=life_dashboard");
  }

  async function handleSkip() {
    try {
      await fetch("/api/onboarding/complete-core", { method: "POST" });
    } catch (err) {
      console.error("Failed to mark onboarding complete:", err);
    }
    router.push("/life");
  }

  return (
    <div className="min-h-screen p-4 py-12 md:py-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <Compass className="w-16 h-16 text-violet-500 mx-auto" />
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Your Life Command Center
          </h1>
          <p className="text-lg text-zinc-400 max-w-xl mx-auto">
            Pulse shows the big picture on /life, and lets you dive into work, money, people, and strategy from there.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
                className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50"
              >
                <Icon className="w-8 h-8 text-violet-400 mb-3" />
                <h3 className="text-lg font-semibold text-white mb-1">{feature.label}</h3>
                <p className="text-sm text-zinc-400">{feature.description}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Button
            onClick={handleTakeTour}
            size="lg"
            className="bg-violet-600 hover:bg-violet-700"
          >
            Take a Quick Tour
          </Button>
          <Button
            onClick={handleSkip}
            variant="ghost"
            size="lg"
            className="text-zinc-400 hover:text-zinc-300"
          >
            Go to my dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}




