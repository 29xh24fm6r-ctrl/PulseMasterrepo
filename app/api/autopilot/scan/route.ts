// app/api/autopilot/scan/route.ts
// Trigger autopilot scan (enqueue job) — bulletproof + DB-aligned
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createLogger } from "@/lib/obs/log";

const logger = createLogger({ source: "autopilot_scan_api" });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  console.log("AUTOPILOT SCAN: starting");

  try {
    // Step 4: Hard-debug auth before resolver
    const { userId } = await auth();
    console.log("AUTOPILOT SCAN auth() userId:", userId);
    
    if (!userId) {
      console.error("AUTOPILOT SCAN: No userId from auth() - middleware/session issue");
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED: User must be authenticated" },
        { status: 401 }
      );
    }

    // Step 6: Bulletproof resolver error handling
    let clerkUserId: string | null = null;
    let supabaseUserId: string | null = null;

    try {
      const resolved = await resolveSupabaseUser();
      clerkUserId = resolved.clerkUserId;
      supabaseUserId = resolved.supabaseUserId;
      console.log("AUTOPILOT SCAN USER", { clerkUserId, supabaseUserId });
    } catch (e: any) {
      console.error("resolveSupabaseUser failed:", e?.message || e);
      return NextResponse.json(
        { ok: false, error: `resolveSupabaseUser_failed: ${e?.message || "unknown"}` },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({} as any));
    const scopes: string[] =
      Array.isArray(body?.scopes) && body.scopes.length > 0
        ? body.scopes
        : ["tasks", "deals"];

    // Idempotency: one scan per user per day (UTC)
    const today = new Date().toISOString().split("T")[0];
    const idempotencyKey = `autopilot.scan:${today}`;

    const correlationId =
      (typeof body?.correlation_id === "string" && body.correlation_id) ||
      cryptoRandomUUIDSafe();

    // Step 2: Set both scheduled_at and run_at explicitly (future-proof)
    const nowIso = new Date().toISOString();

    // Try to insert - if idempotency unique index exists, duplicates will fail
    const { data: job, error: insertErr } = await supabaseAdmin
      .from("job_queue")
      .insert({
        user_id: supabaseUserId,
        job_type: "autopilot.scan",
        status: "queued",
        idempotency_key: idempotencyKey,
        correlation_id: correlationId,
        scheduled_at: nowIso,
        run_at: nowIso,
        lane: "interactive", // User-triggered
        priority: 10,
        payload: {
          owner_user_id: clerkUserId, // REQUIRED downstream
          scopes,
        },
      })
      .select("id, status, correlation_id")
      .single();

    if (insertErr) {
      // Check if it's a duplicate (idempotency conflict)
      if (insertErr.code === "23505" || insertErr.message?.includes("unique") || insertErr.message?.includes("duplicate")) {
        // Job already exists - fetch it
        const { data: existingJob } = await supabaseAdmin
          .from("job_queue")
          .select("id, status")
          .eq("user_id", supabaseUserId)
          .eq("job_type", "autopilot.scan")
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();

        if (existingJob) {
          return NextResponse.json({
            ok: true,
            job_id: existingJob.id,
            status: existingJob.status,
            message: "already queued",
          });
        }
      }

      // Other error - surface it
      console.error("AUTOPILOT SCAN enqueue error:", insertErr);
      logger.error("Failed to enqueue autopilot scan", insertErr);
      return NextResponse.json(
        { ok: false, error: insertErr?.message || "enqueue_failed" },
        { status: 500 }
      );
    }

    if (!job) {
      return NextResponse.json(
        { ok: false, error: "enqueue_failed: no job returned" },
        { status: 500 }
      );
    }

    logger.info("Autopilot scan enqueued", {
      supabaseUserId,
      clerkUserId,
      job_id: job.id,
      correlation_id: correlationId,
      scopes,
    });

    return NextResponse.json({
      ok: true,
      job_id: job.id,
      status: job.status,
      correlation_id: correlationId,
      scopes,
    });
  } catch (err: any) {
    console.error("AUTOPILOT SCAN ERROR:", err);
    console.error("AUTOPILOT SCAN ERROR MESSAGE:", err?.message);
    logger.error("Autopilot scan endpoint failed", err);
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) || "Failed to trigger scan" },
      { status: 500 }
    );
  }
}

function cryptoRandomUUIDSafe() {
  try {
    // @ts-ignore
    return (
      globalThis.crypto?.randomUUID?.() ||
      `cid_${Date.now()}_${Math.random().toString(16).slice(2)}`
    );
  } catch {
    return `cid_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}
