import { NextResponse } from "next/server";
import { runReplayWorker } from "@/lib/xp/replay/worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const body = await req.json();
    const { user_id, max_jobs } = body ?? {};

    if (!user_id) return NextResponse.json({ ok: false, error: "user_id required" }, { status: 400 });

    const out = await runReplayWorker({ userId: user_id, maxJobs: max_jobs ?? 50 });
    return NextResponse.json({ ok: true, ...out });
}
