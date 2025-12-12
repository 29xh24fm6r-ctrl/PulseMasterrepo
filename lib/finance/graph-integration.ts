// Finance Intelligence Graph Integration
// lib/finance/graph-integration.ts

import { supabaseAdmin } from "@/lib/supabase";
import { getUserGoals } from "./goals";
import { getFinanceSnapshots } from "./snapshots";
import { getUserFinanceAlerts } from "./insights";

/**
 * Create Intelligence Graph nodes from finance data
 */
export async function createFinanceGraphNodes(userId: string): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Check if Intelligence Graph tables exist
  const { data: graphTableExists } = await supabaseAdmin
    .from("intelligence_graph_nodes")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (!graphTableExists) {
    // Intelligence Graph not yet implemented - skip
    return;
  }

  // Get finance goals
  const goals = await getUserGoals(userId);
  for (const goal of goals) {
    // Create node for each active goal
    await supabaseAdmin
      .from("intelligence_graph_nodes")
      .upsert({
        user_id: dbUserId,
        node_type: "finance_goal",
        node_id: goal.id,
        title: goal.name,
        metadata: {
          type: goal.type,
          target_amount: goal.target_amount,
          current_amount: goal.current_amount,
          status: goal.status,
        },
        created_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,node_type,node_id",
      });
  }

  // Get recent snapshots
  const snapshots = await getFinanceSnapshots(userId, {
    startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    periodType: "month",
  });

  for (const snapshot of snapshots.slice(0, 6)) {
    await supabaseAdmin
      .from("intelligence_graph_nodes")
      .upsert({
        user_id: dbUserId,
        node_type: "finance_snapshot",
        node_id: snapshot.id,
        title: `Finance Snapshot ${snapshot.period_start}`,
        metadata: {
          income: snapshot.income,
          expenses: snapshot.expenses,
          net_cashflow: snapshot.net_cashflow,
          savings: snapshot.savings,
        },
        created_at: snapshot.created_at,
      }, {
        onConflict: "user_id,node_type,node_id",
      });
  }

  // Get recent alerts
  const alerts = await getUserFinanceAlerts(userId, { limit: 10 });
  for (const alert of alerts) {
    await supabaseAdmin
      .from("intelligence_graph_nodes")
      .upsert({
        user_id: dbUserId,
        node_type: "finance_alert",
        node_id: alert.id,
        title: alert.title,
        metadata: {
          type: alert.type,
          severity: alert.severity,
          is_positive: alert.is_positive,
        },
        created_at: alert.created_at,
      }, {
        onConflict: "user_id,node_type,node_id",
      });
  }
}

/**
 * Create Intelligence Graph edges from finance data
 */
export async function createFinanceGraphEdges(userId: string): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Check if Intelligence Graph tables exist
  const { data: graphTableExists } = await supabaseAdmin
    .from("intelligence_graph_edges")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (!graphTableExists) {
    // Intelligence Graph not yet implemented - skip
    return;
  }

  // Get financial_reset or financial_growth arcs
  const { data: financialArcs } = await supabaseAdmin
    .from("life_arcs")
    .select("id, key")
    .eq("user_id", dbUserId)
    .in("key", ["financial_reset", "financial_growth"])
    .eq("status", "active");

  // Get finance goals
  const goals = await getUserGoals(userId);

  // Create edges: finance_goal -> financial_reset_arc
  for (const goal of goals) {
    if (goal.type === "debt_paydown" || goal.type === "spending_cut") {
      const resetArc = financialArcs?.find((a) => a.key === "financial_reset");
      if (resetArc) {
        await supabaseAdmin
          .from("intelligence_graph_edges")
          .upsert({
            user_id: dbUserId,
            source_type: "finance_goal",
            source_id: goal.id,
            target_type: "life_arc",
            target_id: resetArc.id,
            edge_type: "part_of",
            strength: 0.7,
            created_at: new Date().toISOString(),
          }, {
            onConflict: "user_id,source_type,source_id,target_type,target_id,edge_type",
          });
      }
    } else if (goal.type === "savings" || goal.type === "income_target") {
      const growthArc = financialArcs?.find((a) => a.key === "financial_growth");
      if (growthArc) {
        await supabaseAdmin
          .from("intelligence_graph_edges")
          .upsert({
            user_id: dbUserId,
            source_type: "finance_goal",
            source_id: goal.id,
            target_type: "life_arc",
            target_id: growthArc.id,
            edge_type: "part_of",
            strength: 0.7,
            created_at: new Date().toISOString(),
          }, {
            onConflict: "user_id,source_type,source_id,target_type,target_id,edge_type",
          });
      }
    }
  }
}




