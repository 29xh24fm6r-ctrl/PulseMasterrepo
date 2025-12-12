// Today Focus Panel
// app/components/life-dashboard/TodayFocusPanel.tsx

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AppCard } from "@/components/ui/AppCard";
import { AnimatedList, AnimatedListItem } from "@/components/ui/AnimatedList";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Target, ArrowRight } from "lucide-react";
import Link from "next/link";
import { CoachLauncher } from "@/app/components/coaching/CoachLauncher";

interface DailyFocus {
  id: string;
  title: string;
  arcId?: string;
  questId?: string;
  arc?: {
    name: string;
    key: string;
  };
}

export function TodayFocusPanel() {
  const [focus, setFocus] = useState<DailyFocus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFocus();
  }, []);

  async function loadFocus() {
    try {
      const res = await fetch("/api/life-arc/autopilot/daily-focus");
      if (res.ok) {
        const data = await res.json();
        setFocus(data.focus || []);
      }
    } catch (err) {
      console.error("Failed to load daily focus:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppCard
      title="Today's Focus"
      description="Top moves that support your current strategy."
      actions={
        <div className="flex items-center gap-2">
          <CoachLauncher
            coachKey="productivity"
            origin="life.today"
            variant="link"
            label="Ask Productivity Coach"
          />
          <Button size="sm" variant="outline" asChild>
            <Link href="/life">View all</Link>
          </Button>
        </div>
      }
    >
      {loading ? (
        <LoadingState message="Loading your focus items…" />
      ) : focus.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No focus items yet"
          description="Autopilot will suggest focus items based on your Life Arcs."
        />
      ) : (
        <AnimatedList className="space-y-3">
          {focus.slice(0, 5).map((item, index) => (
            <AnimatedListItem key={item.id}>
              <motion.div
                className={`flex items-start justify-between gap-3 p-4 rounded-lg border transition-all duration-200 ${
                  index === 0
                    ? "bg-gradient-to-r from-violet-600/10 to-violet-600/5 border-violet-600/30 hover:border-violet-600/50"
                    : "bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600"
                }`}
                whileHover={{ x: 1, backgroundColor: index === 0 ? "rgba(139, 92, 246, 0.15)" : "rgba(39, 39, 42, 0.6)" }}
                transition={{ duration: 0.15 }}
              >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-sm font-semibold text-white">
                    {item.title}
                  </div>
                  {index === 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-violet-600/20 text-violet-400 border border-violet-600/30 animate-pulse-soft">
                      Top Priority
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {item.arc && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-violet-600/20 text-violet-400 border border-violet-600/30">
                      {item.arc.name}
                    </span>
                  )}
                  <div className="flex gap-1">
                    {[1, 2, 3].map((dot) => (
                      <div
                        key={dot}
                        className="w-1.5 h-1.5 rounded-full bg-zinc-600"
                      />
                    ))}
                  </div>
                </div>
              </div>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-shrink-0 h-8 w-8 p-0 rounded-md hover:bg-zinc-700/50 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              </motion.div>
            </AnimatedListItem>
          ))}
        </AnimatedList>
      )}
    </AppCard>
  );
}

