// Autonomous Weekly Planner UI
// app/(authenticated)/weekly-planner/page.tsx

"use client";

import { useState, useEffect } from "react";
import { WeeklyPlan } from "@/lib/planning/weekly/v2/types";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Target, Users, DollarSign, AlertTriangle, Zap, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedList, AnimatedListItem } from "@/components/ui/AnimatedList";

export default function WeeklyPlannerPage() {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    loadWeeklyPlan();
  }, []);

  async function loadWeeklyPlan() {
    setLoading(true);
    try {
      const res = await fetch("/api/weekly-plan/run", {
        method: "POST",
      });
      if (res.ok) {
        const planData = await res.json();
        setPlan(planData);
      }
    } catch (err) {
      console.error("Failed to load weekly plan:", err);
    } finally {
      setLoading(false);
    }
  }

  async function readPlanAloud() {
    if (!plan) return;

    // Trigger voice autonomy to read the plan
    try {
      await fetch("/api/voice/autonomy/fire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trigger: "weekly_plan_ready",
          message: `Your weekly plan: Big Three priorities are ${plan.bigThree.join(", ")}. You have ${plan.domainObjectives.length} domain objectives and ${plan.relationshipTouches.length} relationship touches planned.`,
        }),
      });
    } catch (err) {
      console.error("Failed to read plan:", err);
    }
  }

  if (loading) {
    return <LoadingState message="Generating your weekly plan..." />;
  }

  if (!plan) {
    return (
      <div className="text-center py-8 text-sm text-zinc-400">
        Failed to generate weekly plan
      </div>
    );
  }

  const weekStart = new Date(plan.weekStart);
  const weekEnd = new Date(plan.weekEnd);

  return (
    <main className="flex flex-col gap-4 p-4 lg:p-6 max-w-7xl mx-auto">
      <header className="flex items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Weekly Planner</h1>
          <p className="text-sm text-zinc-400">
            {weekStart.toLocaleDateString()} - {weekEnd.toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadWeeklyPlan} variant="outline">
            Regenerate
          </Button>
          <Button onClick={readPlanAloud} className="flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Read My Week
          </Button>
        </div>
      </header>

      {/* Big Three */}
      <AppCard title="Big Three" description="Your top priorities for the week">
        <AnimatedList>
          {plan.bigThree.map((priority, i) => (
            <AnimatedListItem key={i}>
              <div className="p-3 bg-violet-500/10 border border-violet-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-semibold text-white">{priority}</span>
                </div>
              </div>
            </AnimatedListItem>
          ))}
        </AnimatedList>
      </AppCard>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Domain Objectives */}
        <AppCard
          title="Domain Objectives"
          description={`${plan.domainObjectives.length} objectives`}
        >
          <div className="space-y-2">
            {plan.domainObjectives.map((obj) => (
              <div
                key={obj.domain}
                className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-white capitalize">
                    {obj.domain}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {obj.microSteps.length} steps
                  </Badge>
                </div>
                <div className="text-xs text-zinc-400">{obj.title}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  {Math.round(obj.estimatedMinutes / 60)}h estimated
                </div>
              </div>
            ))}
          </div>
        </AppCard>

        {/* Relationship Touches */}
        <AppCard
          title="Relationship Touches"
          description={`${plan.relationshipTouches.length} planned`}
        >
          <div className="space-y-2">
            {plan.relationshipTouches.map((touch) => (
              <div
                key={touch.personId}
                className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-white">{touch.personName}</span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {touch.action}
                  </Badge>
                </div>
                <div className="text-xs text-zinc-400">
                  {touch.dayOfWeek !== undefined
                    ? `Day ${touch.dayOfWeek + 1}`
                    : "This week"}
                </div>
              </div>
            ))}
          </div>
        </AppCard>

        {/* Financial Checkpoints */}
        <AppCard
          title="Financial Checkpoints"
          description={`${plan.financialCheckpoints.length} checkpoints`}
        >
          <div className="space-y-2">
            {plan.financialCheckpoints.map((checkpoint, i) => (
              <div
                key={i}
                className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-white">{checkpoint.title}</span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {checkpoint.type}
                  </Badge>
                </div>
                {checkpoint.amount && (
                  <div className="text-xs text-zinc-400">${checkpoint.amount}</div>
                )}
              </div>
            ))}
          </div>
        </AppCard>

        {/* Risk Mitigations */}
        {plan.riskMitigations.length > 0 && (
          <AppCard
            title="Risk Mitigations"
            description={`${plan.riskMitigations.length} mitigations`}
          >
            <div className="space-y-2">
              {plan.riskMitigations.slice(0, 3).map((mitigation) => (
                <div
                  key={mitigation.id}
                  className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
                >
                  <div className="text-sm text-white">{mitigation.title}</div>
                </div>
              ))}
            </div>
          </AppCard>
        )}

        {/* Opportunity Moves */}
        {plan.opportunityMoves.length > 0 && (
          <AppCard
            title="Opportunity Moves"
            description={`${plan.opportunityMoves.length} opportunities`}
          >
            <div className="space-y-2">
              {plan.opportunityMoves.slice(0, 3).map((move) => (
                <div
                  key={move.id}
                  className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
                >
                  <div className="text-sm text-white">{move.title}</div>
                </div>
              ))}
            </div>
          </AppCard>
        )}

        {/* Mission Alignment */}
        {plan.missionAlignment && (
          <AppCard
            title="Mission Alignment"
            description={`${Math.round(plan.missionAlignment.alignmentScore * 100)}% aligned`}
          >
            <div className="space-y-2">
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 transition-all"
                  style={{ width: `${plan.missionAlignment.alignmentScore * 100}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {plan.missionAlignment.alignmentTags.map((tag, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </AppCard>
        )}
      </div>

      {/* Daily Plans */}
      <AppCard title="Daily Plans" description="Day-by-day breakdown">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plan.dailyPlans.map((day, i) => (
            <button
              key={i}
              onClick={() => setSelectedDay(selectedDay === i ? null : i)}
              className={cn(
                "p-4 rounded-lg border text-left transition-all",
                selectedDay === i
                  ? "bg-violet-500/20 border-violet-500/50"
                  : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-semibold text-white">{day.dayOfWeek}</div>
                  <div className="text-xs text-zinc-400">
                    {new Date(day.date).toLocaleDateString()}
                  </div>
                </div>
                <Calendar className="w-4 h-4 text-zinc-500" />
              </div>
              <div className="text-xs text-zinc-300 mb-2">{day.focus}</div>
              <div className="space-y-1 text-xs text-zinc-500">
                <div>{day.tasks.length} tasks</div>
                <div>{day.relationshipActions.length} relationship actions</div>
                <div>{day.identityPractices.length} identity practices</div>
                <div>{day.timeBlocks.length} time blocks</div>
              </div>
              {selectedDay === i && (
                <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2">
                  <div className="text-xs font-semibold text-white mb-1">Energy Profile</div>
                  <div className="flex gap-2 text-xs">
                    <span className="text-zinc-400">
                      Morning: <span className="text-white capitalize">{day.energyProfile.morning}</span>
                    </span>
                    <span className="text-zinc-400">
                      Afternoon: <span className="text-white capitalize">{day.energyProfile.afternoon}</span>
                    </span>
                    <span className="text-zinc-400">
                      Evening: <span className="text-white capitalize">{day.energyProfile.evening}</span>
                    </span>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </AppCard>
    </main>
  );
}



