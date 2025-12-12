// Pulse Strategy Board - Executive Dashboard for Life
// app/(authenticated)/strategy-board/page.tsx

"use client";

import { useState, useEffect } from "react";
import { StrategyBoardData } from "@/lib/strategy-board/types";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  DollarSign,
  Briefcase,
  Zap,
  Calendar,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedList, AnimatedListItem } from "@/components/ui/AnimatedList";

export default function StrategyBoardPage() {
  const [data, setData] = useState<StrategyBoardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStrategyBoard();
  }, []);

  async function loadStrategyBoard() {
    setLoading(true);
    try {
      const res = await fetch("/api/strategy-board");
      if (res.ok) {
        const boardData = await res.json();
        setData(boardData);
      }
    } catch (err) {
      console.error("Failed to load strategy board:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState message="Building your Strategy Board..." />;
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-sm text-zinc-400">
        Failed to load strategy board
      </div>
    );
  }

  return (
    <main className="flex flex-col gap-4 p-4 lg:p-6 max-w-7xl mx-auto">
      <header className="mb-2">
        <h1 className="text-3xl font-bold text-white mb-1">Pulse Strategy Board</h1>
        <p className="text-sm text-zinc-400">
          Your executive dashboard for life direction
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Identity Arc */}
        <AppCard title="Identity Arc" description={`${data.identityArc.archetype} mode`}>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-semibold text-white capitalize">
                {data.identityArc.archetype}
              </span>
            </div>
            <p className="text-xs text-zinc-400">{data.identityArc.narrativeShift}</p>
            <div className="text-xs text-zinc-500">
              {data.identityArc.dailyPractices.length} daily practices,{" "}
              {data.identityArc.weeklyPractices.length} weekly practices
            </div>
          </div>
        </AppCard>

        {/* Strategic Priorities */}
        <AppCard
          title="Strategic Priorities"
          description={`${data.strategicPriorities.length} priorities`}
        >
          <AnimatedList>
            {data.strategicPriorities.slice(0, 3).map((priority) => (
              <AnimatedListItem key={priority.id}>
                <div className="p-2 bg-zinc-900/50 rounded border border-zinc-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white">{priority.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(priority.progress * 100)}%
                    </Badge>
                  </div>
                  <div className="text-xs text-zinc-400">{priority.description}</div>
                  <div className="mt-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 transition-all"
                      style={{ width: `${priority.progress * 100}%` }}
                    />
                  </div>
                </div>
              </AnimatedListItem>
            ))}
          </AnimatedList>
        </AppCard>

        {/* Daily Levers */}
        <AppCard title="Daily Levers" description="Top 3 controllables">
          <div className="space-y-2">
            {data.dailyLevers.map((lever) => (
              <div
                key={lever.id}
                className="p-2 bg-zinc-900/50 rounded border border-zinc-800"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white">{lever.title}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      lever.impact === "high" && "border-green-500/50 text-green-400"
                    )}
                  >
                    {lever.impact} impact
                  </Badge>
                </div>
                <div className="text-xs text-zinc-400">{lever.action}</div>
              </div>
            ))}
          </div>
        </AppCard>

        {/* Opportunities */}
        <AppCard
          title="Opportunities"
          description={`${data.opportunities.length} opportunities`}
        >
          <AnimatedList>
            {data.opportunities.slice(0, 3).map((opp) => (
              <AnimatedListItem key={opp.id}>
                <div className="p-2 bg-green-500/10 rounded border border-green-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-white">{opp.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {opp.priority}
                    </Badge>
                  </div>
                  <div className="text-xs text-zinc-400">{opp.description}</div>
                </div>
              </AnimatedListItem>
            ))}
          </AnimatedList>
        </AppCard>

        {/* Risks */}
        <AppCard title="Risks" description={`${data.risks.length} risks`}>
          <AnimatedList>
            {data.risks.slice(0, 3).map((risk) => (
              <AnimatedListItem key={risk.id}>
                <div
                  className={cn(
                    "p-2 rounded border",
                    risk.severity === "high" && "bg-red-500/10 border-red-500/30",
                    risk.severity === "medium" && "bg-yellow-500/10 border-yellow-500/30",
                    risk.severity === "low" && "bg-zinc-900/50 border-zinc-800"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle
                      className={cn(
                        "w-4 h-4",
                        risk.severity === "high" && "text-red-400",
                        risk.severity === "medium" && "text-yellow-400"
                      )}
                    />
                    <span className="text-sm text-white">{risk.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {risk.severity}
                    </Badge>
                  </div>
                  <div className="text-xs text-zinc-400">{risk.description}</div>
                </div>
              </AnimatedListItem>
            ))}
          </AnimatedList>
        </AppCard>

        {/* Financial Health */}
        <AppCard title="Financial Health" description={data.financialHealth.summary}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Current</span>
              <Badge variant="outline" className="text-xs capitalize">
                {data.financialHealth.currentState}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Projected</span>
              <Badge variant="outline" className="text-xs capitalize">
                {data.financialHealth.projectedState}
              </Badge>
            </div>
            {data.financialHealth.riskFactors.length > 0 && (
              <div className="text-xs text-red-400">
                Risks: {data.financialHealth.riskFactors.join(", ")}
              </div>
            )}
          </div>
        </AppCard>

        {/* Career Map */}
        <AppCard title="Career Trajectory" description={data.careerMap.currentPhase}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Phase</span>
              <Badge variant="outline" className="text-xs capitalize">
                {data.careerMap.currentPhase}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Trajectory</span>
              <div className="flex items-center gap-1">
                {data.careerMap.trajectory === "accelerating" ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
                <span className="text-xs text-white capitalize">
                  {data.careerMap.trajectory}
                </span>
              </div>
            </div>
            <div className="text-xs text-zinc-500">
              {data.careerMap.keyMilestones.length} key milestones
            </div>
          </div>
        </AppCard>

        {/* Key Relationships */}
        <AppCard
          title="Key Relationships"
          description={`${data.keyRelationships.length} relationship plans`}
        >
          <div className="space-y-2">
            {data.keyRelationships.slice(0, 3).map((rel) => (
              <div key={rel.id} className="p-2 bg-zinc-900/50 rounded border border-zinc-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white">{rel.personName}</span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {rel.goal}
                  </Badge>
                </div>
                <div className="text-xs text-zinc-400">
                  {rel.microPlan.microSteps.length} steps, {rel.estimatedDuration} days
                </div>
              </div>
            ))}
          </div>
        </AppCard>

        {/* Life Chapters */}
        <AppCard
          title="Life Chapters"
          description={`${data.lifeChapters.length} recent chapters`}
        >
          <div className="space-y-2">
            {data.lifeChapters.slice(-3).map((chapter) => (
              <div key={chapter.id} className="p-2 bg-zinc-900/50 rounded border border-zinc-800">
                <div className="text-sm font-semibold text-white mb-1">{chapter.title}</div>
                <div className="text-xs text-zinc-400">{chapter.narrativeSummary}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  {chapter.majorThemes?.join(", ")}
                </div>
              </div>
            ))}
          </div>
        </AppCard>

        {/* Mission Profile */}
        {data.missionProfile && (
          <AppCard title="Mission & Purpose" description={data.missionProfile.mission}>
            <div className="space-y-2">
              <div className="p-2 bg-violet-500/10 border border-violet-500/30 rounded">
                <div className="text-xs text-zinc-400 mb-1">Mission</div>
                <div className="text-sm text-white">{data.missionProfile.mission}</div>
              </div>
              <div className="p-2 bg-violet-500/10 border border-violet-500/30 rounded">
                <div className="text-xs text-zinc-400 mb-1">North Star</div>
                <div className="text-sm text-white">{data.missionProfile.northStar}</div>
              </div>
              <div className="text-xs text-zinc-500">
                {data.missionProfile.recurringThemes.length} recurring themes
              </div>
            </div>
          </AppCard>
        )}

        {/* Social Graph Summary */}
        {data.socialGraph && (
          <AppCard
            title="Social Graph"
            description={`${data.socialGraph.nodes.length} relationships mapped`}
          >
            <div className="space-y-2">
              <div className="text-sm text-white">
                {data.socialGraph.nodes.length} nodes, {data.socialGraph.edges.length} connections
              </div>
              {data.socialGraph.clusters && data.socialGraph.clusters.length > 0 && (
                <div className="text-xs text-zinc-400">
                  {data.socialGraph.clusters.length} clusters detected
                </div>
              )}
            </div>
          </AppCard>
        )}

        {/* Time Slices Summary */}
        {data.timeSlices && (
          <AppCard
            title="Time Optimization"
            description="Weekly time allocation"
          >
            <div className="space-y-2">
              {Object.entries(data.timeSlices.weeklyDistribution).map(([domain, minutes]) => (
                <div key={domain} className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 capitalize">{domain}</span>
                  <span className="text-xs text-white">{Math.round(minutes / 60)}h</span>
                </div>
              ))}
              <div className="text-xs text-zinc-500 mt-2">
                {data.timeSlices.focusBlocks.length} focus blocks,{" "}
                {data.timeSlices.flowStateWindows.length} flow windows
              </div>
            </div>
          </AppCard>
        )}

        {/* Weekly Plan Summary */}
        {data.weeklyPlan && (
          <AppCard
            title="Weekly Plan"
            description={`${data.weeklyPlan.bigThree.length} priorities`}
          >
            <div className="space-y-1">
              {data.weeklyPlan.bigThree.map((priority, i) => (
                <div key={i} className="text-xs text-zinc-300">
                  {i + 1}. {priority}
                </div>
              ))}
              {data.weeklyPlan.missionAlignment && (
                <div className="mt-2 text-xs text-zinc-500">
                  Mission alignment:{" "}
                  {Math.round(data.weeklyPlan.missionAlignment.alignmentScore * 100)}%
                </div>
              )}
            </div>
          </AppCard>
        )}
      </div>

      {/* Life Narrative Tab */}
      <AppCard title="Life Story" description="Your narrative arc">
        <div className="space-y-4">
          <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-lg">
            <div className="text-sm font-semibold text-white mb-1">Current Chapter</div>
            <div className="text-lg text-violet-300 mb-2">
              {/* Would need to fetch narrative */}
              Building your story...
            </div>
          </div>
          <div className="text-xs text-zinc-400">
            Visit /narrative to see your complete life narrative
          </div>
        </div>
      </AppCard>
    </main>
  );
}

