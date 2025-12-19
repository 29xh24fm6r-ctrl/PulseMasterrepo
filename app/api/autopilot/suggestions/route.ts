// app/api/autopilot/suggestions/route.ts
// Fetch automation suggestions (RLS-enforced via user-scoped client)
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { createUserSupabaseClient } from "@/lib/supabase/userClient";
import { createLogger } from "@/lib/obs/log";

const logger = createLogger({ source: "autopilot_suggestions_api" });

export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set(["open", "dismissed", "snoozed", "accepted"]);

export async function GET(req: NextRequest) {
  try {
    const { supabaseUserId, supabaseAccessToken } = await resolveSupabaseUser();
    const supabase = createUserSupabaseClient(supabaseAccessToken);

    const searchParams = req.nextUrl.searchParams;
    const limitRaw = searchParams.get("limit") || "50";
    const statusRaw = searchParams.get("status") || "open";

    const limit = Math.max(1, Math.min(200, parseInt(limitRaw, 10) || 50));
    const status = VALID_STATUSES.has(statusRaw) ? statusRaw : "open";

    const nowIso = new Date().toISOString();

    let query = supabase
      .from("life_arc_autopilot_suggestions")
      .select("*")
      .eq("user_id", supabaseUserId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status === "open") {
      query = query.or(
        `status.eq.open,and(status.eq.snoozed,snoozed_until.lt.${nowIso})`
      );
    } else {
      query = query.eq("status", status);
    }

    const { data: suggestions, error } = await query;

    if (error) {
      logger.error("Failed to fetch suggestions", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      status,
      suggestions: suggestions || [],
      count: suggestions?.length || 0,
      now: nowIso,
    });
  } catch (err: any) {
    logger.error("Fetch suggestions endpoint failed", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}
