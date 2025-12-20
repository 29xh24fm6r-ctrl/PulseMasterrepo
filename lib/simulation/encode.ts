// Encode User Model to Digital Twin
// lib/simulation/encode.ts

import "server-only";

import { DigitalTwinState, createDefaultTwin } from "./twin";
import { getCurrentEmotionState } from "@/lib/emotion-os/server";
import { getLifeArcPlan } from "@/lib/life-arc/planner";
import { getCareerContextForMemory } from "@/lib/career/integrations";

export interface UserModelSnapshot {
  emotionState?: {
    primary?: string;
    intensity?: number;
  };
  stressScore?: number;
  careerContext?: {
    level?: string;
    progressToNext?: number;
  };
  lifeArcs?: Array<{
    key: string;
    priority: number;
    progress?: number;
  }>;
  habitStreaks?: Array<{
    habitId: string;
    streak: number;
  }>;
  companionState?: {
    warmthScore?: number;
    trustScore?: number;
  };
}

/**
 * Encode user model into digital twin state
 */
export async function encodeUserModelToTwin(
  userId: string
): Promise<DigitalTwinState> {
  const twin = createDefaultTwin();

  // Get emotion state
  try {
    const emotionState = await getCurrentEmotionState(userId);
    if (emotionState) {
      // Map emotion to mood (-50 to +50)
      const emotionMoodMap: Record<string, number> = {
        depressed: -40,
        sad: -30,
        anxious: -20,
        stressed: -15,
        overwhelmed: -25,
        neutral: 0,
        calm: 10,
        happy: 30,
        excited: 40,
        energized: 35,
      };
      twin.mood = emotionMoodMap[emotionState.detected_emotion?.toLowerCase() || "neutral"] || 0;
      twin.stress = (emotionState.intensity || 0.5) * 100;
    }
  } catch (err) {
    // Optional
  }

  // Get career context
  try {
    const careerContext = await getCareerContextForMemory(userId);
    if (careerContext) {
      twin.career_velocity = careerContext.progressToNext * 100;
      
      // Map career level to base velocity
      const levelMap: Record<string, number> = {
        rookie: 30,
        operator: 50,
        pro: 70,
        elite: 85,
        master: 95,
      };
      const baseVelocity = levelMap[careerContext.level] || 50;
      twin.career_velocity = (twin.career_velocity + baseVelocity) / 2;
    }
  } catch (err) {
    // Optional
  }

  // Get life arcs
  try {
    const lifeArcPlan = await getLifeArcPlan(userId);
    for (const arc of lifeArcPlan.arcs) {
      const progress = arc.targetDate
        ? calculateArcProgress(arc.startDate, arc.targetDate)
        : 0;

      switch (arc.key) {
        case "healing":
        case "emotional_stability":
          twin.arc_momentum.healing = progress;
          twin.emotional_resilience = 50 + progress * 0.5;
          break;
        case "career_level_up":
        case "career_transition":
          twin.arc_momentum.career = progress;
          break;
        case "performance_push":
          twin.arc_momentum.performance = progress;
          twin.sales_pipeline_health = 50 + progress * 0.5;
          break;
        case "identity_rebuild":
          twin.arc_momentum.identity = progress;
          break;
        case "financial_reset":
          twin.arc_momentum.financial = progress;
          break;
      }
    }
  } catch (err) {
    // Optional
  }

  // Calculate energy from stress and mood
  twin.energy = 50 + (twin.mood * 0.5) - (twin.stress * 0.3);
  twin.energy = Math.max(0, Math.min(100, twin.energy));

  // Estimate habit consistency (placeholder - would use actual habit data)
  twin.habit_consistency = 50; // Default
  twin.sleep_quality = 50; // Default
  twin.focus_capacity = twin.energy * 0.8; // Correlated with energy

  // Calculate risks
  if (twin.stress > 70 && twin.arc_momentum.performance > 50) {
    twin.risk.burnout = (twin.stress - 70) * 2;
  }

  if (twin.arc_momentum.healing < 30 && twin.stress > 60) {
    twin.risk.relapse = (twin.stress - 60) * 1.5;
  }

  // Relationship stability (placeholder)
  twin.relationship_stability = 50;

  // Growth momentum (combination of multiple factors)
  twin.growth_momentum = (
    twin.career_velocity * 0.3 +
    twin.arc_momentum.career * 0.2 +
    twin.arc_momentum.performance * 0.2 +
    twin.habit_consistency * 0.15 +
    twin.emotional_resilience * 0.15
  );

  // Financial Pressure (from finance data if available)
  try {
    const { getFinanceOverview } = await import("@/lib/finance/api");
    const financeOverview = await getFinanceOverview(userId);
    const netCashflow = financeOverview.currentMonth.netCashflow;
    
    // Calculate financial pressure: negative cashflow = pressure
    if (netCashflow < 0) {
      // More negative = more pressure (capped at 100)
      const pressure = Math.min(100, Math.abs(netCashflow) / 1000 * 20);
      // Add to stress (financial pressure contributes to stress)
      twin.stress = Math.max(0, Math.min(100, twin.stress + pressure * 0.3));
    }
    
    // Also check for runway risk alerts
    const runwayAlerts = financeOverview.alerts?.filter((a: any) => a.type === "runway_risk") || [];
    if (runwayAlerts.length > 0) {
      twin.stress = Math.max(0, Math.min(100, twin.stress + 15));
    }

    // Update financial arc momentum based on goals
    const financialGoals = financeOverview.goals?.filter((g: any) => 
      g.type === "savings" || g.type === "debt_paydown"
    ) || [];
    if (financialGoals.length > 0) {
      const avgProgress = financialGoals.reduce((sum: number, g: any) => {
        if (g.target_amount && g.current_amount) {
          return sum + (g.current_amount / g.target_amount);
        }
        return sum;
      }, 0) / financialGoals.length;
      twin.arc_momentum.financial = Math.min(100, avgProgress * 100);
    }
  } catch (err) {
    // Finance data not available - that's okay
  }

  return twin;
}

/**
 * Calculate arc progress based on dates
 */
function calculateArcProgress(startDate: string, targetDate: string): number {
  const start = new Date(startDate);
  const target = new Date(targetDate);
  const now = new Date();

  const totalDays = (target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  const elapsedDays = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

  if (totalDays <= 0) return 100;
  return Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
}

