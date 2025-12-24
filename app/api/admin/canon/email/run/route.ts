import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/canon/email/run
 * 
 * Runs the email canon (autofix + assert) and returns the result.
 */
export async function POST() {
  const { data, error } = await supabaseAdmin.rpc("canon_run_email");

  if (error) {
    return NextResponse.json(
      { ok: false, domain: "email", error: error.message },
      { status: 500 }
    );
  }

  // canon_run_email returns jsonb
  return NextResponse.json(data ?? { ok: true, domain: "email" });
}

