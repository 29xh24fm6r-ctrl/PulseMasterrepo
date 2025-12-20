// app/api/xp/summary/route.ts (migrated from Notion to Supabase)
import { NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Get today's transactions
    const { data: todayTx, error: todayError } = await supabaseAdmin
      .from("xp_transactions")
      .select("amount")
      .eq("user_id", supabaseUserId)
      .gte("created_at", todayStart.toISOString());

    if (todayError) {
      console.error("Error fetching today's XP:", todayError);
    }

    // Get all transactions
    const { data: allTx, error: allError } = await supabaseAdmin
      .from("xp_transactions")
      .select("amount")
      .eq("user_id", supabaseUserId);

    if (allError) {
      console.error("Error fetching all XP:", allError);
      return NextResponse.json({
        ok: false,
        error: "Failed to get XP summary",
      }, { status: 500 });
    }

    const xpToday = (todayTx || []).reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);
    const xpTotal = (allTx || []).reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);

    return NextResponse.json({
      ok: true,
      xpToday,
      xpTotal,
    });
  } catch (err: any) {
    console.error("XP summary error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to get XP summary",
      },
      { status: 500 }
    );
  }
}
