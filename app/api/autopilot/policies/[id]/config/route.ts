// app/api/autopilot/policies/[id]/config/route.ts
// Update policy configuration (DB-aligned)
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createLogger } from "@/lib/obs/log";
import { randomUUID } from "crypto";

const logger = createLogger({ source: "autopilot_policy_config_api" });

export const dynamic = "force-dynamic";

/**
 * POST /api/autopilot/policies/[id]/config
 * 
 * Updates policy configuration.
 * Body: { 
 *   trigger_conditions?: Record<string, any>,
 *   action_config?: Record<string, any>,
 *   name?: string,
 *   description?: string,
 * }
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

    const body = await req.json();
    
    // Build update payload (only allow specific fields)
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.trigger_conditions !== undefined) {
      updateData.trigger_conditions = body.trigger_conditions;
    }
    if (body.action_config !== undefined) {
      updateData.action_config = body.action_config;
    }
    if (body.name !== undefined) {
      updateData.name = body.name;
    }
    if (body.description !== undefined) {
      updateData.description = body.description;
    }

    // Update policy
    const { data: updatedPolicy, error: updateError } = await supabaseAdmin
      .from("plugin_automations")
      .update(updateData)
      .eq("id", policyId)
      .eq("owner_user_id", clerkUserId)  // Bulletproof: enforce ownership
      .select("*")
      .single();

    if (updateError) {
      logger.error("Failed to update policy config", updateError);
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    // Audit log with deltas
    const correlationId = randomUUID();
    const deltas: Record<string, any> = {};
    for (const key of Object.keys(updateData)) {
      if (key !== "updated_at" && policy[key as keyof typeof policy] !== updateData[key]) {
        deltas[key] = {
          from: policy[key as keyof typeof policy],
          to: updateData[key],
        };
      }
    }

    await supabaseAdmin.from("audit_log").insert({
      user_id: policy.user_id, // Use UUID from policy
      source: "ui",
      event_type: "autopilot.policy_updated",
      entity_type: "plugin_automation",
      entity_id: policyId,
      action: "update",
      payload: {
        policy_name: policy.name,
        policy_id: policyId,
        deltas,
      },
      correlation_id: correlationId,
    });

    logger.info("Policy config updated", {
      clerkUserId,
      policy_id: policyId,
      deltas: Object.keys(deltas),
    });

    return NextResponse.json({
      ok: true,
      policy: updatedPolicy,
    });
  } catch (err: any) {
    logger.error("Update policy config endpoint failed", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to update policy config" },
      { status: 500 }
    );
  }
}
