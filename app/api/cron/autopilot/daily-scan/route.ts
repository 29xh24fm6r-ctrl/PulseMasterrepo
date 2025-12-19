import "server-only";
import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/auth/requireCronSecret";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runOneJobAny } from "@/lib/jobs/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    requireCronSecret(req);

    const url = new URL(req.url);
    const shouldTick = url.searchParams.get("tick") === "1";
    const tickN = Math.min(parseInt(url.searchParams.get("n") || "25", 10) || 25, 50);

    const today = new Date().toISOString().split("T")[0];
    const idempotencyKey = `autopilot.scan:${today}`;
    const nowIso = new Date().toISOString();

    // Get all users (Option A: all users)
    // Do NOT invent autopilot_enabled column yet
    const { data: users, error: usersErr } = await supabaseAdmin
      .from("users")
      .select("id")
      .limit(10000); // Reasonable cap

    if (usersErr) {
      return NextResponse.json({ ok: false, error: usersErr.message }, { status: 500 });
    }

    let enqueued = 0;
    let skipped = 0;

    for (const user of users ?? []) {
      // Enqueue scan job (idempotency handled by unique constraint)
      const { error: insertErr } = await supabaseAdmin
        .from("job_queue")
        .insert({
          user_id: user.id,
          job_type: "autopilot.scan",
          status: "queued",
          idempotency_key: idempotencyKey,
          correlation_id: crypto.randomUUID(),
          scheduled_at: nowIso,
          run_at: nowIso,
          lane: "cron", // Cron-triggered
          priority: 100,
          payload: {
            scopes: ["tasks", "deals"],
            enqueued_via: "cron",
          },
        });

      if (insertErr) {
        // If unique constraint violation, count as skipped (do not error whole run)
        if (insertErr.code === "23505" || insertErr.message?.includes("unique")) {
          skipped++;
        } else {
          // Log but continue
          console.error(`Failed to enqueue scan for user ${user.id}:`, insertErr);
        }
      } else {
        enqueued++;
      }
    }

    const result: any = {
      ok: true,
      enqueued,
      skipped,
      total_users: users?.length ?? 0,
    };

    // Optional "scan then tick"
    if (shouldTick) {
      const lockedBy = process.env.VERCEL_REGION
        ? `cron:${process.env.VERCEL_REGION}`
        : `cron:local:${process.pid}`;

      const tickResults: any[] = [];
      for (let i = 0; i < tickN; i++) {
        const r = await runOneJobAny({ lockedBy, lockSeconds: 300 });
        tickResults.push(r);
        if (!r.ran) break;
      }

      result.tick = {
        requested: tickN,
        ran_count: tickResults.filter((r) => r.ran).length,
        results: tickResults,
      };
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: e?.status ?? 500 }
    );
  }
}

