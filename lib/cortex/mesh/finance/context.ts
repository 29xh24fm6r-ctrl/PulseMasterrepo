// Finance Domain Context Builder (Mesh v2)
// lib/cortex/mesh/finance/context.ts

import { supabaseAdmin } from "@/lib/supabase";
import { PulseDomainContext } from "@/lib/cortex/types";

/**
 * Build finance domain context for Cognitive Mesh
 */
export async function buildFinanceContext(
  userId: string
): Promise<PulseDomainContext["finance"]> {
  try {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    const dbUserId = userRow?.id || userId;

    // Get accounts summary
    // TODO: Integrate with actual finance system
    const accountsSummary: PulseDomainContext["finance"]["accountsSummary"] = {
      totalBalance: 0,
      availableBalance: 0,
      accounts: [],
    };

    // Get upcoming obligations (bills, payments)
    const { data: obligations } = await supabaseAdmin
      .from("financial_obligations")
      .select("id, title, amount, due_date, category")
      .eq("user_id", dbUserId)
      .gte("due_date", new Date().toISOString())
      .order("due_date", { ascending: true })
      .limit(20);

    const upcomingObligations =
      obligations?.map((o) => ({
        id: o.id,
        title: o.title,
        amount: o.amount || 0,
        dueDate: o.due_date,
        category: o.category || "other",
      })) || [];

    // Calculate cashflow projection
    // TODO: Implement actual cashflow calculation
    const cashflowProjection: PulseDomainContext["finance"]["cashflowProjection"] = {
      next30Days: 0,
      trend: "neutral",
    };

    return {
      accountsSummary,
      upcomingObligations,
      cashflowProjection,
    };
  } catch (err) {
    console.warn("[FinanceMesh] Failed to build context:", err);
    return {
      accountsSummary: {
        totalBalance: 0,
        availableBalance: 0,
        accounts: [],
      },
      upcomingObligations: [],
    };
  }
}



