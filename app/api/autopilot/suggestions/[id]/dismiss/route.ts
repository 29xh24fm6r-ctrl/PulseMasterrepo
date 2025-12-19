// app/api/autopilot/suggestions/[id]/dismiss/route.ts
// Dismiss an automation suggestion (RLS-enforced via user-scoped client)
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { createUserSupabaseClient } from "@/lib/supabase/userClient";
import { createLogger } from "@/lib/obs/log";

const logger = createLogger({ source: "autopilot_dismiss_api" });

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabaseUserId, supabaseAccessToken } = await resolveSupabaseUser();
    const supabase = createUserSupabaseClient(supabaseAccessToken);

    const suggestionId = params.id;

    const { data, error } = await supabase
      .from("life_arc_autopilot_suggestions")
      .update({
        status: "dismissed",
        snoozed_until: null,
      })
      .eq("id", suggestionId)
      .eq("user_id", supabaseUserId) // optional; RLS already enforces, kept for performance
      .select("id,status")
      .maybeSingle();

    if (error) {
      // If user doesn't own it, RLS typically produces empty result or permission error depending on policy.
      logger.error("Failed to dismiss suggestion", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: "Suggestion not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, suggestion_id: suggestionId, status: "dismissed" });
  } catch (err: any) {
    logger.error("Dismiss suggestion endpoint failed", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to dismiss suggestion" },
      { status: 500 }
    );
  }
}
