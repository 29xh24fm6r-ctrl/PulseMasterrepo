// app/api/omega/strategies/route.ts
// View and manage learned strategies

export const dynamic = "force-dynamic";

import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export async function GET(req: Request) {
  const gate = await requireOpsAuth();
  if (!gate.ok || !gate.canon) return Response.json(gate, { status: gate.status });

  return withCompatTelemetry({
    req: req as any,
    userIdUuid: gate.canon.userIdUuid,
    clerkUserId: gate.canon.clerkUserId,
    eventName: "api.omega.strategies.get",
    handler: async () => {
      const url = new URL(req.url);
      const active = url.searchParams.get("active") !== "false";
      const strategyType = url.searchParams.get("type");

      const supabase = getSupabaseAdminRuntimeClient();

      let query = supabase
        .from("pulse_strategies")
        .select("*")
        .eq("user_id", gate.canon.clerkUserId)
        .order("confidence", { ascending: false });

      if (active) {
        query = query.eq("active", true);
      }

      if (strategyType) {
        query = query.eq("strategy_type", strategyType);
      }

      const { data, error } = await query;

      if (error) throw error;

      const strategies = (data || []).map((s: any) => ({
        id: s.id,
        strategyType: s.strategy_type,
        pattern: s.pattern,
        successCount: s.success_count,
        failureCount: s.failure_count,
        confidence: s.confidence,
        active: s.active,
        learnedFrom: s.learned_from,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        // Computed
        successRate: s.success_count + s.failure_count > 0
          ? s.success_count / (s.success_count + s.failure_count)
          : 0.5,
      }));

      return Response.json({ ok: true, strategies });
    },
  });
}

export async function POST(req: Request) {
  const gate = await requireOpsAuth();
  if (!gate.ok || !gate.canon) return Response.json(gate, { status: gate.status });

  return withCompatTelemetry({
    req: req as any,
    userIdUuid: gate.canon.userIdUuid,
    clerkUserId: gate.canon.clerkUserId,
    eventName: "api.omega.strategies.post",
    handler: async () => {
      const body = await req.json();
      const { strategyId, action } = body;

      if (!strategyId || !action) {
        return Response.json(
          { ok: false, error: "Missing required fields: strategyId, action" },
          { status: 400 }
        );
      }

      const supabase = getSupabaseAdminRuntimeClient();

      if (action === "activate") {
        await supabase
          .from("pulse_strategies")
          .update({ active: true, updated_at: new Date().toISOString() })
          .eq("id", strategyId)
          .eq("user_id", gate.canon.clerkUserId);
      } else if (action === "deactivate") {
        await supabase
          .from("pulse_strategies")
          .update({ active: false, updated_at: new Date().toISOString() })
          .eq("id", strategyId)
          .eq("user_id", gate.canon.clerkUserId);
      } else if (action === "delete") {
        await supabase
          .from("pulse_strategies")
          .delete()
          .eq("id", strategyId)
          .eq("user_id", gate.canon.clerkUserId);
      } else {
        return Response.json(
          { ok: false, error: "Invalid action. Must be: activate, deactivate, or delete" },
          { status: 400 }
        );
      }

      return Response.json({ ok: true, action, strategyId });
    },
  });
}
