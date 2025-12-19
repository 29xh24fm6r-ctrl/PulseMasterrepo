import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { runDeadSweeper } from "@/lib/ops/dead-sweeper";
import { log } from "@/lib/obs/logger";
import { getRequestMeta } from "@/lib/obs/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const roles = ((sessionClaims as any)?.roles || []) as string[];
    const adminIds = process.env.PULSE_ADMIN_CLERK_IDS?.split(",").map((s) => s.trim()) || [];
    const allowed = roles.includes("admin") || roles.includes("ops") || adminIds.includes(userId);
    
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const lookbackDays = Number(url.searchParams.get("days") || "30");

    const report = await runDeadSweeper({
      lookbackDays,
      dormantIfNoEvents: true,
    });

    return NextResponse.json(report);
  } catch (err: any) {
    console.error("[DEAD_SWEEPER_API_ERROR]", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Dead Sweeper failed" },
      { status: 500 }
    );
  }
}

