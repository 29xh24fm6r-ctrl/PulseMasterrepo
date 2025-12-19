// app/api/autopilot/agent-reports/route.ts
// Sprint 4: Get agent reports for command center
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const { data: reports, error } = await supabaseAdmin
      .from("agent_reports")
      .select(`
        *,
        agents (
          id,
          name,
          agent_type
        )
      `)
      .eq("user_id", supabaseUserId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ ok: true, items: reports || [] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

