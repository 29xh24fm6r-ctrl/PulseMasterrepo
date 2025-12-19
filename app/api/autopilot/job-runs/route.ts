// app/api/autopilot/job-runs/route.ts
// Sprint 4: Get job runs for command center
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const { data: runs, error } = await supabaseAdmin
      .from("job_runs")
      .select("*")
      .eq("user_id", supabaseUserId)
      .order("started_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ ok: true, items: runs || [] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

