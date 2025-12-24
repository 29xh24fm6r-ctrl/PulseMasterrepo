// app/api/identity/momentum/route.ts
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/requireUserId";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/pulse/isUuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export async function GET() {
  try {
    const userId = await requireUserId();
    const sp = supabaseAdmin;

    // Dev override smoke-test
    if (!isUuid(userId)) {
      return NextResponse.json({
        ok: true,
        momentum: {
          score7d: 0,
          xp7d: 0,
          xpToday: 0,
          streakDays: 0,
          lastActiveAt: null,
          trend: "flat" as const,
        },
      });
    }

    const since7d = daysAgo(7);
    const since1d = daysAgo(1);

    // XP last 7 days
    const { data: xp7, error: e7 } = await sp
      .from("xp_events")
      .select("final_xp,occurred_at")
      .eq("user_id", userId)
      .gte("occurred_at", since7d)
      .order("occurred_at", { ascending: false });

    if (e7) throw e7;

    const xp7d = (xp7 ?? []).reduce((sum: number, r: any) => sum + (Number(r.final_xp) || 0), 0);

    // XP last 24h
    const { data: xp1, error: e1 } = await sp
      .from("xp_events")
      .select("final_xp,occurred_at")
      .eq("user_id", userId)
      .gte("occurred_at", since1d)
      .order("occurred_at", { ascending: false });

    if (e1) throw e1;

    const xpToday = (xp1 ?? []).reduce((sum: number, r: any) => sum + (Number(r.final_xp) || 0), 0);

    // Streak: count consecutive days with at least one xp_event, up to 30 days
    const since30d = daysAgo(30);
    const { data: xp30, error: e30 } = await sp
      .from("xp_events")
      .select("occurred_at")
      .eq("user_id", userId)
      .gte("occurred_at", since30d)
      .order("occurred_at", { ascending: false });

    if (e30) throw e30;

    const daysWithActivity = new Set<string>();
    for (const row of xp30 ?? []) {
      const day = String(row.occurred_at || "").slice(0, 10); // YYYY-MM-DD
      if (day) daysWithActivity.add(day);
    }

    let streakDays = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (daysWithActivity.has(key)) streakDays++;
      else break;
    }

    const lastActiveAt = (xp7?.[0]?.occurred_at ?? null) as string | null;

    // Score heuristic: normalize xp7d into 0..100
    const score7d = Math.max(0, Math.min(100, Math.round((xp7d / 500) * 100)));

    const trend = xpToday > 0 ? "up" : xp7d > 0 ? "flat" : "down";

    return NextResponse.json({
      ok: true,
      momentum: {
        score7d,
        xp7d,
        xpToday,
        streakDays,
        lastActiveAt,
        trend,
      },
    });
  } catch (e: any) {
    const msg = e?.message ?? "Failed";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

