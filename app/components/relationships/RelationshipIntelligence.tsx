// Relationship Intelligence Panel
// app/components/relationships/RelationshipIntelligence.tsx

"use client";

import { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Target, TrendingUp, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface RelationshipAnalysis {
  state: any;
  scores: any;
  risks: any[];
  opportunities: any[];
  plans: {
    reconnect?: any;
    repair?: any;
    strengthen?: any;
  };
}

export function RelationshipIntelligence({ personId }: { personId: string }) {
  const [analysis, setAnalysis] = useState<RelationshipAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalysis();
  }, [personId]);

  async function loadAnalysis() {
    setLoading(true);
    try {
      const res = await fetch(`/api/relationships/v2/analyze?personId=${personId}`);
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data);
      }
    } catch (err) {
      console.error("Failed to load analysis:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState message="Analyzing relationship..." />;
  }

  if (!analysis) {
    return <div className="text-sm text-zinc-400">No analysis available</div>;
  }

  return (
    <div className="space-y-4">
      {/* Scores */}
      <AppCard title="Relationship Scores" description="Health, engagement, value, urgency">
        <div className="grid grid-cols-2 gap-3">
          <ScoreCard label="Health" value={analysis.scores.health} max={100} />
          <ScoreCard label="Engagement" value={analysis.scores.engagement} max={100} />
          <ScoreCard label="Value" value={analysis.scores.value} max={100} />
          <ScoreCard label="Urgency" value={analysis.scores.urgency} max={100} />
        </div>
      </AppCard>

      {/* Risks */}
      {analysis.risks.length > 0 && (
        <AppCard title="Risk Alerts" description={`${analysis.risks.length} risks detected`}>
          <div className="space-y-2">
            {analysis.risks.map((risk: any) => (
              <div
                key={risk.id}
                className={cn(
                  "p-3 rounded-lg border",
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
                  <span className="text-sm font-semibold text-white">{risk.type}</span>
                  <Badge variant="outline" className="text-xs">
                    {risk.severity}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-300 mb-2">{risk.description}</p>
                <p className="text-xs text-zinc-400">
                  Recommended: {risk.recommendedAction}
                </p>
              </div>
            ))}
          </div>
        </AppCard>
      )}

      {/* Opportunities */}
      {analysis.opportunities.length > 0 && (
        <AppCard
          title="Opportunities"
          description={`${analysis.opportunities.length} opportunities identified`}
        >
          <div className="space-y-2">
            {analysis.opportunities.map((opp: any) => (
              <div
                key={opp.id}
                className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-semibold text-white">{opp.type}</span>
                  <Badge variant="outline" className="text-xs">
                    {opp.priority}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-300 mb-2">{opp.description}</p>
                <p className="text-xs text-zinc-400">
                  Suggested: {opp.suggestedAction}
                </p>
              </div>
            ))}
          </div>
        </AppCard>
      )}

      {/* Plans */}
      {(analysis.plans.reconnect || analysis.plans.repair || analysis.plans.strengthen) && (
        <AppCard title="Recommended Plans" description="EF-generated relationship plans">
          <div className="space-y-3">
            {analysis.plans.reconnect && (
              <PlanCard plan={analysis.plans.reconnect} goal="reconnect" />
            )}
            {analysis.plans.repair && <PlanCard plan={analysis.plans.repair} goal="repair" />}
            {analysis.plans.strengthen && (
              <PlanCard plan={analysis.plans.strengthen} goal="strengthen" />
            )}
          </div>
        </AppCard>
      )}
    </div>
  );
}

function ScoreCard({ label, value, max }: { label: string; value: number; max: number }) {
  const percentage = (value / max) * 100;
  const color =
    percentage >= 70
      ? "text-green-400"
      : percentage >= 40
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
      <div className="text-xs text-zinc-400 mb-1">{label}</div>
      <div className={cn("text-2xl font-bold", color)}>{Math.round(value)}</div>
      <div className="mt-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all",
            percentage >= 70 && "bg-green-500",
            percentage >= 40 && percentage < 70 && "bg-yellow-500",
            percentage < 40 && "bg-red-500"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function PlanCard({ plan, goal }: { plan: any; goal: string }) {
  return (
    <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-white capitalize">{goal} Plan</h4>
        <Badge variant="outline" className="text-xs">
          {plan.microPlan.microSteps.length} steps
        </Badge>
      </div>
      <p className="text-xs text-zinc-400 mb-3">{plan.goal}</p>
      <div className="space-y-1">
        {plan.microPlan.microSteps.slice(0, 3).map((step: any, i: number) => (
          <div key={i} className="text-xs text-zinc-300 flex items-center gap-2">
            <span className="text-zinc-500">{i + 1}.</span>
            <span>{step.title}</span>
          </div>
        ))}
        {plan.microPlan.microSteps.length > 3 && (
          <div className="text-xs text-zinc-500">
            +{plan.microPlan.microSteps.length - 3} more steps
          </div>
        )}
      </div>
      <div className="mt-3 text-xs text-zinc-500">
        Estimated: {plan.estimatedDuration} days
      </div>
    </div>
  );
}



