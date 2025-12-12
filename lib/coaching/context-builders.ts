// Coach Context Builders
// lib/coaching/context-builders.ts

import { buildFinancialCoachContext } from "@/lib/finance/coach";
import { getFinanceOverview } from "@/lib/finance/api";
import { getRelationshipRadar } from "@/lib/crm/radar";
import { getDeals } from "@/lib/crm/deals";
import { buildPulseGuideContext } from "./context/pulse-guide";

export interface CoachContext {
  summary?: string;
  data?: any;
}

/**
 * Build context for Financial Coach
 */
export async function buildFinancialCoachContextForSession(userId: string): Promise<CoachContext> {
  try {
    const contextString = await buildFinancialCoachContext(userId);
    const overview = await getFinanceOverview(userId);
    return {
      summary: "Current month cashflow, budgets, goals, and alerts",
      data: {
        overview,
        contextString,
      },
    };
  } catch (err) {
    return {
      summary: "Financial data not available",
      data: {},
    };
  }
}

/**
 * Build context for Strategy Coach
 */
export async function buildStrategyCoachContextForSession(userId: string): Promise<CoachContext> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/strategy/current`);
    if (res.ok) {
      const data = await res.json();
      return {
        summary: "90-day strategy, selected path, pillars, and Life Arcs",
        data: data.strategy || {},
      };
    }
  } catch (err) {
    // Strategy not available
  }
  return {
    summary: "Strategy data not available",
    data: {},
  };
}

/**
 * Build context for Sales Coach
 */
export async function buildSalesCoachContextForSession(userId: string): Promise<CoachContext> {
  try {
    const { getRelationshipRadar } = await import("@/lib/crm/radar");
    const { getDeals } = await import("@/lib/crm/deals");
    
    const [radar, deals] = await Promise.all([
      getRelationshipRadar(userId, 10),
      getDeals(userId),
    ]);
    const openDeals = deals.filter((d) => !["won", "lost"].includes(d.stage));
    const atRiskDeals = openDeals.filter((d) => d.health && d.health.risk_level >= 4);

    // Calculate pipeline summary by stage
    const byStage: Record<string, { count: number; amount: number }> = {};
    openDeals.forEach((deal) => {
      if (!byStage[deal.stage]) {
        byStage[deal.stage] = { count: 0, amount: 0 };
      }
      byStage[deal.stage].count += 1;
      byStage[deal.stage].amount += deal.amount || 0;
    });

    return {
      summary: "Open deals, relationship radar, and pipeline health",
      data: {
        radar,
        openDeals,
        atRiskDeals,
        pipelineSummary: {
          totalCount: openDeals.length,
          totalAmount: openDeals.reduce((sum, d) => sum + (d.amount || 0), 0),
          byStage,
        },
      },
    };
  } catch (err) {
    return {
      summary: "CRM data not available",
      data: {},
    };
  }
}

/**
 * Build context for Career Coach
 */
export async function buildCareerCoachContextForSession(userId: string): Promise<CoachContext> {
  try {
    // Get career context from Career Engine
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/career/context`);
    if (res.ok) {
      const data = await res.json();
      return {
        summary: "Career level, progress, and job profile",
        data: data.context || {},
      };
    }
  } catch (err) {
    // Career data not available
  }
  return {
    summary: "Career data not available",
    data: {},
  };
}

/**
 * Build context for Confidant
 */
export async function buildConfidantContextForSession(userId: string): Promise<CoachContext> {
  try {
    // Get emotion state
    const emotionRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/emotion/current`);
    const emotion = emotionRes.ok ? await emotionRes.json() : null;

    // Get recent life arcs
    const arcsRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/life-arc/plan`);
    const arcs = arcsRes.ok ? await arcsRes.json() : null;

    return {
      summary: "Current emotional state and active Life Arcs",
      data: {
        emotion: emotion?.emotion || {},
        arcs: arcs?.plan?.arcs || [],
      },
    };
  } catch (err) {
    return {
      summary: "Emotion data not available",
      data: {},
    };
  }
}

/**
 * Build context for Productivity Coach
 */
export async function buildProductivityCoachContextForSession(userId: string): Promise<CoachContext> {
  try {
    // Get today's focus and autopilot queue
    const focusRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/life-arc/autopilot/daily-focus`);
    const focus = focusRes.ok ? await focusRes.json() : null;

    return {
      summary: "Today's focus items and autopilot queue",
      data: {
        focus: focus?.focus || [],
      },
    };
  } catch (err) {
    return {
      summary: "Productivity data not available",
      data: {},
    };
  }
}

/**
 * Build context based on coach key
 */
export async function buildCoachContext(
  userId: string,
  coachKey: string,
  origin?: string
): Promise<CoachContext> {
  switch (coachKey) {
    case "financial":
      return await buildFinancialCoachContextForSession(userId);
    case "strategy":
      return await buildStrategyCoachContextForSession(userId);
    case "sales":
      return await buildSalesCoachContextForSession(userId);
    case "career":
      return await buildCareerCoachContextForSession(userId);
    case "confidant":
      return await buildConfidantContextForSession(userId);
    case "productivity":
      return await buildProductivityCoachContextForSession(userId);
    case "pulse_guide":
      const pulseGuideContext = await buildPulseGuideContext(userId, origin);
      return {
        summary: `User is asking for help using Pulse. Focus: ${pulseGuideContext.userFocusProfile?.primaryFocus || "not set"}. Current page: ${pulseGuideContext.currentPage || "unknown"}. Enabled modules: ${JSON.stringify(pulseGuideContext.enabledModules)}.`,
        data: pulseGuideContext,
      };
    default:
      return {
        summary: "General context",
        data: {},
      };
  }
}

