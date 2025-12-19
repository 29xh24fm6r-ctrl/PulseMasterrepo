import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { withApiAnalytics } from "@/lib/analytics/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withApiAnalytics(req, async () => {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") || "system";

  let viewName = "job_queue_reliability_24h";
  let query = supabaseAdmin.from(viewName).select("*").limit(1);

  if (scope === "user") {
    const { supabaseUserId } = await resolveSupabaseUser();
    viewName = "job_queue_reliability_24h_user";
    query = supabaseAdmin
      .from(viewName)
      .select("*")
      .eq("user_id", supabaseUserId)
      .limit(1);
  }

  const { data, error } = await query.maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, reliability: data ?? null, scope });
  });
}

