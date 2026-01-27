import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

/**
 * GET /api/approvals — List pending proposals
 * Query params: ?status=pending (default) | approved | denied | executed | all
 */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "pending";

  try {
    const db = getSupabaseAdminRuntimeClient();
    let query = db
      .from("pulse_proposals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, proposals: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
