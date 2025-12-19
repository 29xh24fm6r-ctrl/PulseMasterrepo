// app/api/automation/actions/[id]/reject/route.ts
// Sprint 4: Reject an automation action
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/automation/actions/[id]/reject
 * 
 * Rejects an automation action (marks as rejected).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const resolvedParams = params instanceof Promise ? await params : params;
    const actionId = resolvedParams.id;

    const { data: action, error } = await supabaseAdmin
      .from("automation_actions")
      .update({
        status: "rejected",
      })
      .eq("id", actionId)
      .eq("user_id", supabaseUserId)
      .eq("status", "suggested")
      .select("*")
      .single();

    if (error || !action) {
      return NextResponse.json({ error: "Action not found or not suggested" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      action,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to reject action" },
      { status: 500 }
    );
  }
}

