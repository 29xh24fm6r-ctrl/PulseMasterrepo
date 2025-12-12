// CRM Coach Context Builders
// lib/crm/coach.ts

import { getRelationshipRadar, RelationshipRadarItem } from "./radar";
import { getDeals, CrmDealWithHealth } from "./deals";
import { getContacts } from "./contacts";
import { getInteractions, CrmInteraction } from "./interactions";

export interface SalesCoachContext {
  openDeals: CrmDealWithHealth[];
  atRiskDeals: CrmDealWithHealth[];
  pipelineSummary: {
    totalCount: number;
    totalAmount: number;
    byStage: Record<string, { count: number; amount: number }>;
  };
  topContacts: RelationshipRadarItem[];
}

export interface RelationshipCoachContext {
  radarItems: RelationshipRadarItem[];
  recentInteractions: CrmInteraction[];
  relationshipArcs: Array<{
    id: string;
    name: string;
    key: string;
  }>;
}

/**
 * Build Sales Coach context
 */
export async function buildSalesCoachContext(userId: string): Promise<SalesCoachContext> {
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
    openDeals,
    atRiskDeals,
    pipelineSummary: {
      totalCount: openDeals.length,
      totalAmount: openDeals.reduce((sum, d) => sum + (d.amount || 0), 0),
      byStage,
    },
    topContacts: radar,
  };
}

/**
 * Build Relationship Coach context
 */
export async function buildRelationshipCoachContext(userId: string): Promise<RelationshipCoachContext> {
  const [radar, interactions] = await Promise.all([
    getRelationshipRadar(userId, 10),
    getInteractions(userId, { limit: 20 }),
  ]);

  // Get relationship-related Life Arcs
  let relationshipArcs: Array<{ id: string; name: string; key: string }> = [];
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/life-arc/plan`);
    if (res.ok) {
      const data = await res.json();
      relationshipArcs = (data.plan?.arcs || []).filter((arc: any) =>
        arc.key?.includes("relationship") || arc.name?.toLowerCase().includes("relationship")
      );
    }
  } catch (err) {
    // Life Arcs not available
  }

  return {
    radarItems: radar,
    recentInteractions: interactions,
    relationshipArcs,
  };
}




