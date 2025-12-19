// app/api/autopilot/policies/[id]/toggle/route.ts
// Toggle policy enabled/disabled state (DB-aligned)
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createLogger } from "@/lib/obs/log";
import { randomUUID } from "crypto";

const logger = createLogger({ source: "autopilot_policy_toggle_api" });

export const dynamic = "force-dynamic";

/**
 * POST /api/autopilot/policies/[id]/toggle
 * 
 * Toggles the is_active state of a policy.
 * Body: { is_active: boolean } (optional, defaults to toggling current state)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { clerkUserId } = await resolveSupabaseUser();
    const policyId = params.id;

    // Verify policy belongs to user and is an autopilot policy
    const { data: policy, error: fetchError } = await supabaseAdmin
      .from("plugin_automations")
      .select("*")
      .eq("id", policyId)
      .eq("owner_user_id", clerkUserId)  // Bulletproof: filter by Clerk ID
      .eq("trigger_event", "autopilot.scan")
      .eq("action_type", "suggest")
      .single();

    if (fetchError || !policy) {
      // Do not leak existence - return 404
      return NextResponse.json(
        { ok: false, error: "Policy not found" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const newActive = body.is_active !== undefined ? body.is_active : !policy.is_active;

    // If state isn't changing, return early
    if (newActive === policy.is_active) {
      return NextResponse.json({
        ok: true,
        policy: { ...policy, is_active: newActive },
      });
    }

    // Update policy
    const { data: updatedPolicy, error: updateError } = await supabaseAdmin
      .from("plugin_automations")
      .update({
        is_active: newActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", policyId)
      .eq("owner_user_id", clerkUserId)  // Bulletproof: enforce ownership
      .select("*")
      .single();

    if (updateError) {
      logger.error("Failed to toggle policy", updateError);
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    // Audit log
    const correlationId = randomUUID();
    await supabaseAdmin.from("audit_log").insert({
      user_id: policy.user_id, // Use UUID from policy
      source: "ui",
      event_type: newActive ? "autopilot.policy_enabled" : "autopilot.policy_disabled",
      entity_type: "plugin_automation",
      entity_id: policyId,
      action: newActive ? "enable" : "disable",
      payload: {
        policy_name: policy.name,
        policy_id: policyId,
        previous_state: policy.is_active,
        new_state: newActive,
      },
      correlation_id: correlationId,
    });

    logger.info("Policy toggled", {
      clerkUserId,
      policy_id: policyId,
      is_active: newActive,
    });

    return NextResponse.json({
      ok: true,
      policy: updatedPolicy,
    });
  } catch (err: any) {
    logger.error("Toggle policy endpoint failed", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to toggle policy" },
      { status: 500 }
    );
  }
}
