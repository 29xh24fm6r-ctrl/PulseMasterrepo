import "server-only";
import { NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { runOneJob } from "@/lib/jobs/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();

    const lockedBy =
      process.env.VERCEL_REGION
        ? `vercel:${process.env.VERCEL_REGION}`
        : `local:${process.pid}`;

    const out = await runOneJob({
      userId: supabaseUserId,
      lockedBy,
      lockSeconds: 300,
    });

    return NextResponse.json(out, { status: out.ok ? 200 : 500 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: e?.status ?? 500 }
    );
  }
}
