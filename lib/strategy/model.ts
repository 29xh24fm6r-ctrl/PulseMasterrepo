// Strategy Model Builder
// lib/strategy/model.ts

import { getLifeArcPlan } from "@/lib/life-arc/planner";
import { encodeUserModelToTwin } from "@/lib/simulation/encode";
import { DigitalTwinState } from "@/lib/simulation/twin";
import { supabaseAdmin } from "@/lib/supabase";
import { getWeeklyObjectives } from "@/lib/life-arc/autopilot/integration";
import { LifeArc } from "@/lib/life-arc/model";

export interface StrategyModel {
  timestamp: string;
  horizonDays: number;

  lifeArcs: {
    id: string;
    key: string;
    name: string;
    priority: number;
    momentum: number;          // 0–100 from checkpoints
    riskFlags: string[];       // from life_arc_risk_events
  }[];

  twin: DigitalTwinState;      // from simulation/twin.ts

  risks: {
    burnout: number;
    relapse: number;
    conflict: number;
  };

  opportunities: {
    careerUpside: number;      // 0–100
    healingPotential: number;
    performancePotential: number;
    identityDepthPotential: number;
  };

  graphInsights: Array<{
    id: string;
    category: string;
    title: string;
    body: string;
    strength: number;
    isPositive: boolean;
  }>;

  currentFocus: {
    topArcId?: string;
    topArcKey?: string;
    weeklyObjectives: { arcId: string; summary: string }[];
  };
}

/**
 * Build strategy model from all systems
 */
export async function buildStrategyModel(
  userId: string,
  horizonDays: number
): Promise<StrategyModel> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // 1. Fetch Life Arc plan
  const lifeArcPlan = await getLifeArcPlan(userId);

  // 2. Get arc checkpoints for momentum
  const lifeArcs = [];
  for (const arc of lifeArcPlan.arcs) {
    const { data: latestCheckpoint } = await supabaseAdmin
      .from("life_arc_checkpoints")
      .select("progress_score, risk_flags")
      .eq("arc_id", arc.id)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get risk events
    const { data: riskEvents } = await supabaseAdmin
      .from("life_arc_risk_events")
      .select("risk_type")
      .eq("arc_id", arc.id)
      .eq("user_id", dbUserId)
      .order("created_at", { ascending: false })
      .limit(5);

    const riskFlags = riskEvents?.map((e) => e.risk_type) || [];

    lifeArcs.push({
      id: arc.id,
      key: arc.key,
      name: arc.name,
      priority: arc.priority,
      momentum: computeArcMomentum(arc, latestCheckpoint),
      riskFlags,
    });
  }

  // 3. Fetch Digital Twin
  const twin = await encodeUserModelToTwin(userId);

  // 4. Compute risks from twin
  const risks = {
    burnout: twin.risk.burnout,
    relapse: twin.risk.relapse,
    conflict: twin.risk.conflict,
  };

  // 5. Compute opportunity scores (with financial context)
  const financialContext = await getFinancialContextForStrategy(userId);
  const opportunities = computeOpportunities({ lifeArcs, twin, financialContext });

  // 6. Fetch Graph Insights (placeholder - would use actual Intelligence Graph)
  const graphInsights: StrategyModel["graphInsights"] = [];
  // TODO: Integrate with Intelligence Graph Engine when available

  // 7. Get current focus
  const weeklyObjectives = await getWeeklyObjectives(userId);
  const topArc = lifeArcPlan.focusArc;

  const currentFocus = {
    topArcId: topArc?.id,
    topArcKey: topArc?.key,
    weeklyObjectives: weeklyObjectives.map((obj) => ({
      arcId: "", // Would need to map from objective to arc
      summary: obj.summary,
    })),
  };

  return {
    timestamp: new Date().toISOString(),
    horizonDays,
    lifeArcs,
    twin,
    risks,
    opportunities,
    graphInsights,
    currentFocus,
  };
}

/**
 * Compute arc momentum from checkpoint
 */
function computeArcMomentum(arc: LifeArc, checkpoint: any): number {
  if (checkpoint?.progress_score !== undefined) {
    return checkpoint.progress_score;
  }
  
  // Fallback: estimate from time elapsed if target date exists
  if (arc.targetDate) {
    const start = new Date(arc.startDate);
    const target = new Date(arc.targetDate);
    const now = new Date();
    const totalDays = (target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const elapsedDays = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (totalDays > 0) {
      return Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
    }
  }
  
  return 0;
}

/**
 * Get financial context for strategy
 */
async function getFinancialContextForStrategy(userId: string): Promise<{
  netCashflow?: number;
  financialPressure?: number; // 0-100
  financialUpside?: number; // 0-100
}> {
  try {
    const { getFinanceOverview } = await import("@/lib/finance/api");
    const overview = await getFinanceOverview(userId);
    
    const netCashflow = overview.currentMonth.netCashflow;
    const financialPressure = netCashflow < 0 ? Math.min(100, Math.abs(netCashflow) / 1000 * 10) : 0;
    const financialUpside = netCashflow > 0 ? Math.min(100, netCashflow / 1000 * 10) : 0;
    
    return { netCashflow, financialPressure, financialUpside };
  } catch (err) {
    // Finance data not available
    return {};
  }
}

/**
 * Compute opportunity scores
 */
function computeOpportunities(params: {
  lifeArcs: StrategyModel["lifeArcs"];
  twin: DigitalTwinState;
  financialContext?: {
    netCashflow?: number;
    financialPressure?: number;
    financialUpside?: number;
  };
}): StrategyModel["opportunities"] {
  const { lifeArcs, twin, financialContext } = params;
  
  // Career upside: inverse of current velocity (room to grow)
  const careerUpside = twin.career_velocity < 70 ? 100 - twin.career_velocity : 30;
  
  // Healing potential: inverse of resilience (room to improve)
  const healingPotential = twin.emotional_resilience < 70 ? 100 - twin.emotional_resilience : 30;
  
  // Performance potential: inverse of pipeline health
  const performancePotential = twin.sales_pipeline_health < 70 ? 100 - twin.sales_pipeline_health : 30;
  
  // Identity depth: inverse of identity momentum
  const identityDepthPotential = twin.arc_momentum.identity < 50 ? 100 - twin.arc_momentum.identity : 30;
  
  // Boost opportunities if corresponding arc exists and has high priority
  const careerArc = lifeArcs.find((a) => a.key.includes("career"));
  const healingArc = lifeArcs.find((a) => a.key.includes("healing") || a.key.includes("emotional"));
  const performanceArc = lifeArcs.find((a) => a.key.includes("performance"));
  const identityArc = lifeArcs.find((a) => a.key.includes("identity"));
  
  let finalCareerUpside = careerArc && careerArc.priority <= 2 ? Math.min(100, careerUpside + 20) : careerUpside;
  let finalHealingPotential = healingArc && healingArc.priority <= 2 ? Math.min(100, healingPotential + 20) : healingPotential;
  let finalPerformancePotential = performanceArc && performanceArc.priority <= 2 ? Math.min(100, performancePotential + 20) : performancePotential;
  let finalIdentityDepthPotential = identityArc && identityArc.priority <= 2 ? Math.min(100, identityDepthPotential + 20) : identityDepthPotential;

  // Adjust based on financial context
  if (financialContext) {
    if (financialContext.financialPressure && financialContext.financialPressure > 50) {
      // High financial pressure reduces career/performance upside
      finalCareerUpside = Math.max(0, finalCareerUpside - 10);
      finalPerformancePotential = Math.max(0, finalPerformancePotential - 10);
    }
    if (financialContext.financialUpside && financialContext.financialUpside > 50) {
      // Strong financial upside boosts career/performance
      finalCareerUpside = Math.min(100, finalCareerUpside + 10);
      finalPerformancePotential = Math.min(100, finalPerformancePotential + 10);
    }
  }

  return {
    careerUpside: finalCareerUpside,
    healingPotential: finalHealingPotential,
    performancePotential: finalPerformancePotential,
    identityDepthPotential: finalIdentityDepthPotential,
  };
}

