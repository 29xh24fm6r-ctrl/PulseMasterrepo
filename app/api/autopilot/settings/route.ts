// app/api/autopilot/settings/route.ts
// Update autopilot settings (global, not per-policy)
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createLogger } from "@/lib/obs/log";
import { randomUUID } from "crypto";

const logger = createLogger({ source: "autopilot_settings_api" });

export const dynamic = "force-dynamic";

/**
 * POST /api/autopilot/settings
 * 
 * Updates autopilot settings.
 * Body: { 
 *   max_suggestions_per_day?: number,  // Global default (applied to all policies)
 * }
 * 
 * Note: This updates the default for all policies. Per-policy overrides are set via /policies/:id/config
 */
export async function POST(req: NextRequest) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();

    const body = await req.json();
    
    // For now, we'll update all policies' max_suggestions_per_day if provided
    // In the future, we might have a separate user_settings table
    if (body.max_suggestions_per_day !== undefined) {
      const { error: updateError } = await supabaseAdmin
        .from("automation_policies")
        .update({
          max_suggestions_per_day: body.max_suggestions_per_day,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", supabaseUserId);

      if (updateError) {
        logger.error("Failed to update settings", updateError);
        return NextResponse.json(
          { ok: false, error: updateError.message },
          { status: 500 }
        );
      }

      // Audit log
      const correlationId = randomUUID();
      await supabaseAdmin.from("audit_log").insert({
        user_id: supabaseUserId,
        source: "ui",
        event_type: "autopilot.settings_updated",
        entity_type: "user_settings",
        action: "update",
        payload: {
          max_suggestions_per_day: body.max_suggestions_per_day,
        },
        correlation_id: correlationId,
      });

      logger.info("Autopilot settings updated", {
        user_id: supabaseUserId,
        max_suggestions_per_day: body.max_suggestions_per_day,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Settings updated",
    });
  } catch (err: any) {
    logger.error("Update settings endpoint failed", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to update settings" },
      { status: 500 }
    );
  }
}

