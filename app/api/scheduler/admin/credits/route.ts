import "server-only";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id"); // optional UUID
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "200", 10), 1000);

    const { data: balances, error: balancesErr } = await supabaseAdmin
      .from("job_queue_credit_balances")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(200);

    let ledgerQ = supabaseAdmin
      .from("job_queue_credits_ledger")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (userId) ledgerQ = ledgerQ.eq("user_id", userId);

    const { data: ledger, error: ledgerErr } = await ledgerQ;

    if (balancesErr) return NextResponse.json({ ok: false, error: balancesErr.message }, { status: 500 });
    if (ledgerErr) return NextResponse.json({ ok: false, error: ledgerErr.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      balances: balances ?? [],
      ledger: ledger ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: e?.status ?? 500 }
    );
  }
}

