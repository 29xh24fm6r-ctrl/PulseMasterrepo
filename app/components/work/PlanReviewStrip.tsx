// Plan / Review Strip Component
// app/components/work/PlanReviewStrip.tsx

"use client";

import { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { Button } from "@/components/ui/button";
import { Target, CheckCircle2, TrendingUp, Calendar } from "lucide-react";

interface TodayPlan {
  bigThree: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
}

export function PlanReviewStrip() {
  const [todayPlan, setTodayPlan] = useState<TodayPlan | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    loadTodayPlan();
  }, []);

  async function loadTodayPlan() {
    try {
      const res = await fetch("/api/weekly-plan/today");
      if (res.ok) {
        const data = await res.json();
        setTodayPlan(data.plan || null);
      }
    } catch (err) {
      console.error("Failed to load today's plan:", err);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Today's Plan */}
      <AppCard
        title="Today's Plan"
        description="Your Big 3 outcomes for today"
        actions={
          <Button size="sm" variant="ghost" onClick={loadTodayPlan}>
            Edit
          </Button>
        }
      >
        {todayPlan && todayPlan.bigThree.length > 0 ? (
          <div className="space-y-2">
            {todayPlan.bigThree.map((outcome, index) => (
              <div
                key={outcome.id || index}
                className="flex items-start gap-2 p-2 bg-zinc-800/50 rounded-lg"
              >
                <Target className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">
                    {outcome.title}
                  </div>
                  {outcome.description && (
                    <div className="text-xs text-zinc-400 mt-0.5">
                      {outcome.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-zinc-400">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No plan set for today</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={loadTodayPlan}
            >
              Set Big 3
            </Button>
          </div>
        )}
      </AppCard>

      {/* Daily Review */}
      <AppCard
        title="Daily Review"
        description="End-of-day reflection and planning"
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowReviewModal(true)}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Review
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Focus Sessions</span>
            <span className="text-white font-medium">0</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Items Completed</span>
            <span className="text-white font-medium">0</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">XP Earned Today</span>
            <span className="text-green-400 font-medium">0</span>
          </div>
        </div>
      </AppCard>

      {/* Review Modal - TODO: Implement full modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-white mb-4">Daily Review</h2>
            <p className="text-sm text-zinc-400 mb-4">
              Daily review modal coming soon. This will show completed sessions, XP earned, and reflection prompts.
            </p>
            <Button
              variant="outline"
              onClick={() => setShowReviewModal(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}



