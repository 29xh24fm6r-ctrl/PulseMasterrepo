// app/api/autopilot/policies/route.ts
// Get all autopilot policies for the current user (DB-aligned)
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createLogger } from "@/lib/obs/log";

const logger = createLogger({ source: "autopilot_policies_api" });

export const dynamic = "force-dynamic";

/**
 * GET /api/autopilot/policies
 * 
 * Returns all autopilot policies for the current user.
 * Filters plugin_automations by trigger_event='autopilot.scan' and action_type='suggest'
 */
export async function GET(req: NextRequest) {
  try {
    const { clerkUserId } = await resolveSupabaseUser();

    const { data: policies, error } = await supabaseAdmin
      .from("plugin_automations")
      .select("*")
      .eq("owner_user_id", clerkUserId)  // Filter by Clerk ID
      .eq("trigger_event", "autopilot.scan")
      .eq("action_type", "suggest")
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Failed to fetch policies", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      policies: policies || [],
    });
  } catch (err: any) {
    logger.error("Fetch policies endpoint failed", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to fetch policies" },
      { status: 500 }
    );
  }
}
