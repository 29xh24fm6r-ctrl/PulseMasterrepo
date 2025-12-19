import "server-only";
import { NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");
    const days = Math.min(parseInt(url.searchParams.get("days") || "30", 10) || 30, 90);

    if (userId) {
      // Get budgets for specific user
      const { data, error } = await supabaseAdmin
        .from("job_queue_daily_budget")
        .select("*")
        .eq("user_id", userId)
        .order("day", { ascending: false })
        .limit(days);

      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, budgets: data ?? [] });
    } else {
      // Get today's budgets for all users (small default)
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabaseAdmin
        .from("job_queue_daily_budget")
        .select("*")
        .eq("day", today)
        .order("spent", { ascending: false })
        .limit(100);

      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, budgets: data ?? [] });
    }
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: e?.status ?? 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const userId = body?.user_id as string | undefined;
    const day = body?.day as string | undefined;
    const budget = body?.budget as number | undefined;

    if (!userId || !day || budget === undefined) {
      return NextResponse.json(
        { ok: false, error: "Missing user_id, day, or budget" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("job_queue_daily_budget")
      .upsert(
        {
          user_id: userId,
          day,
          budget,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,day" }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, budget: data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: e?.status ?? 500 }
    );
  }
}

