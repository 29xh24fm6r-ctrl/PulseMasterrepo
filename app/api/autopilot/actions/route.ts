// app/api/autopilot/actions/route.ts
// Sprint 4: Get automation actions for command center
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const status = searchParams.get("status");

    let query = supabaseAdmin
      .from("automation_actions")
      .select("*")
      .eq("user_id", supabaseUserId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: actions, error } = await query;

    if (error) throw error;

    return NextResponse.json({ ok: true, items: actions || [] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
