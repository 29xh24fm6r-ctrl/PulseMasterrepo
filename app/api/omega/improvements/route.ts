// app/api/omega/improvements/route.ts
// View and manage proposed self-improvements

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
    eventName: "api.omega.improvements.get",
    handler: async () => {
      const url = new URL(req.url);
      const status = url.searchParams.get("status") || "proposed";

      const supabase = getSupabaseAdminRuntimeClient();

      let query = supabase
        .from("pulse_improvements")
        .select("*, simulation:pulse_simulations(*)")
        .eq("user_id", gate.canon.clerkUserId)
        .order("created_at", { ascending: false });

      if (status !== "all") {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) throw error;

      const improvements = (data || []).map((i: any) => ({
        id: i.id,
        improvementType: i.improvement_type,
        targetComponent: i.target_component,
        currentState: i.current_state,
        proposedChange: i.proposed_change,
        expectedImpact: i.expected_impact,
        status: i.status,
        guardianReview: i.guardian_review,
        simulation: i.simulation,
        approvedAt: i.approved_at,
        createdAt: i.created_at,
      }));

      return Response.json({ ok: true, improvements });
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
    eventName: "api.omega.improvements.post",
    handler: async () => {
      const body = await req.json();
      const { improvementId, action, review } = body;

      if (!improvementId || !action) {
        return Response.json(
          { ok: false, error: "Missing required fields: improvementId, action" },
          { status: 400 }
        );
      }

      const supabase = getSupabaseAdminRuntimeClient();

      if (action === "approve") {
        // Get the improvement
        const { data: improvement } = await supabase
          .from("pulse_improvements")
          .select("*")
          .eq("id", improvementId)
          .eq("user_id", gate.canon.clerkUserId)
          .single();

        if (!improvement) {
          return Response.json({ ok: false, error: "Improvement not found" }, { status: 404 });
        }

        // Apply the improvement based on type
        // This is where the actual self-modification happens
        if (improvement.improvement_type === "strategy_update") {
          // Update relevant strategies
          const targetPattern = improvement.proposed_change;
          // Implementation depends on what's being changed
        }

        // Mark as approved
        await supabase
          .from("pulse_improvements")
          .update({
            status: "approved",
            guardian_review: review || { approved: true, manual: true },
            approved_at: new Date().toISOString(),
          })
          .eq("id", improvementId);

        // Mark related cognitive limit as addressed
        if (improvement.target_component) {
          await supabase
            .from("pulse_cognitive_limits")
            .update({ addressed: true, improvement_id: improvementId })
            .eq("user_id", gate.canon.clerkUserId)
            .eq("addressed", false);
        }
      } else if (action === "reject") {
        await supabase
          .from("pulse_improvements")
          .update({
            status: "rejected",
            guardian_review: review || { approved: false, reason: "User rejected" },
          })
          .eq("id", improvementId)
          .eq("user_id", gate.canon.clerkUserId);
      } else if (action === "test") {
        await supabase
          .from("pulse_improvements")
          .update({ status: "testing" })
          .eq("id", improvementId)
          .eq("user_id", gate.canon.clerkUserId);
      } else if (action === "rollback") {
        await supabase
          .from("pulse_improvements")
          .update({ status: "rolled_back" })
          .eq("id", improvementId)
          .eq("user_id", gate.canon.clerkUserId);
      } else {
        return Response.json(
          { ok: false, error: "Invalid action. Must be: approve, reject, test, or rollback" },
          { status: 400 }
        );
      }

      return Response.json({ ok: true, action, improvementId });
    },
  });
}
