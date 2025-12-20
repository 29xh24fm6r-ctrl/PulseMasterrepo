import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { refreshWisdomLessonsForUser } from "@/lib/wisdom/aggregator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hoursAgo(h: number) {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1) Check last run (rate-limit per user)
  try {
    const { data: row } = await supabaseAdmin
      .from("wisdom_refresh_runs")
      .select("last_run_at")
      .eq("user_id", userId)
      .maybeSingle();

    const last = row?.last_run_at ? new Date(row.last_run_at) : null;

    // If refreshed in last 24h, skip.
    if (last && last > hoursAgo(24)) {
      return new NextResponse(null, { status: 204 });
    }
  } catch {
    // Never block product flow if audit table/query fails
  }

  // 2) Record start (best effort)
  const startedAt = new Date();
  try {
    await supabaseAdmin
      .from("wisdom_refresh_runs")
      .upsert(
        {
          user_id: userId,
          started_at: startedAt.toISOString(),
          last_status: "running",
          last_error: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
  } catch {
    // ignore
  }

  // 3) Execute refresh (best effort)
  try {
    const since = daysAgo(14);
    const until = new Date();

    await refreshWisdomLessonsForUser(userId, since, until);

    // 4) Record success
    try {
      await supabaseAdmin
        .from("wisdom_refresh_runs")
        .upsert(
          {
            user_id: userId,
            last_run_at: new Date().toISOString(),
            last_status: "ok",
            last_error: null,
            finished_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
    } catch {
      // ignore
    }

    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    // 5) Record failure, but NEVER fail the client
    try {
      await supabaseAdmin
        .from("wisdom_refresh_runs")
        .upsert(
          {
            user_id: userId,
            last_status: "error",
            last_error: String(e?.message || e),
            finished_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
    } catch {
      // ignore
    }

    return new NextResponse(null, { status: 204 });
  }
}

