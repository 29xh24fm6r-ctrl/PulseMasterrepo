// app/api/simulation/runs/[runId]/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireClerkUserId } from "@/lib/auth/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/simulation/runs/:runId
 * Returns full record including input + result (JSONB)
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> | { runId: string } }
) {
  try {
    const clerkUserId = await requireClerkUserId();
    
    // Resolve to database user ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", clerkUserId)
      .maybeSingle();

    const dbUserId = userRow?.id || clerkUserId;

    const resolvedParams = params instanceof Promise ? await params : params;
    const runId = resolvedParams.runId;

    if (!runId) {
      return NextResponse.json({ ok: false, error: "Missing runId" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("simulation_runs")
      .select("*")
      .eq("id", runId)
      .eq("user_id", dbUserId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, run: data }, { status: 200 });
  } catch (err: any) {
    const msg = err?.message || "Failed to load run";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

