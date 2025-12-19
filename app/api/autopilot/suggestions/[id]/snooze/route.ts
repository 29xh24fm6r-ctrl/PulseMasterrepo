// app/api/autopilot/suggestions/[id]/snooze/route.ts
// Snooze an automation suggestion (RLS-enforced via user-scoped client)
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { createUserSupabaseClient } from "@/lib/supabase/userClient";
import { createLogger } from "@/lib/obs/log";

const logger = createLogger({ source: "autopilot_snooze_api" });

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabaseUserId, supabaseAccessToken } = await resolveSupabaseUser();
    const supabase = createUserSupabaseClient(supabaseAccessToken);

    const suggestionId = params.id;

    const body = await req.json().catch(() => ({} as any));
    const minutes = Number(body?.minutes || 0);
    const days = Number(body?.days || 0);
    const untilRaw = typeof body?.until === "string" ? body.until : null;

    let snoozedUntil = new Date();

    if (untilRaw) {
      const parsed = new Date(untilRaw);
      if (!isNaN(parsed.getTime())) snoozedUntil = parsed;
      else snoozedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else if (days > 0) {
      snoozedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    } else if (minutes > 0) {
      snoozedUntil = new Date(Date.now() + minutes * 60 * 1000);
    } else {
      snoozedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    if (snoozedUntil.getTime() <= Date.now()) {
      snoozedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    const { data, error } = await supabase
      .from("life_arc_autopilot_suggestions")
      .update({
        status: "snoozed",
        snoozed_until: snoozedUntil.toISOString(),
      })
      .eq("id", suggestionId)
      .eq("user_id", supabaseUserId) // optional; RLS already enforces, kept for performance
      .select("id,status,snoozed_until")
      .maybeSingle();

    if (error) {
      logger.error("Failed to snooze suggestion", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: "Suggestion not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      suggestion_id: suggestionId,
      status: "snoozed",
      snoozed_until: data.snoozed_until,
    });
  } catch (err: any) {
    logger.error("Snooze suggestion endpoint failed", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to snooze suggestion" },
      { status: 500 }
    );
  }
}
