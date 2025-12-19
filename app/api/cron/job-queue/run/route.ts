import "server-only";
import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/auth/requireCronSecret";
import { runOneJobAny } from "@/lib/jobs/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    requireCronSecret(req);

    const lockedBy =
      process.env.VERCEL_REGION
        ? `cron:${process.env.VERCEL_REGION}`
        : `cron:local:${process.pid}`;

    const out = await runOneJobAny({ lockedBy, lockSeconds: 300 });
    return NextResponse.json(out, { status: out.ok ? 200 : 500 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: e?.status ?? 500 }
    );
  }
}

