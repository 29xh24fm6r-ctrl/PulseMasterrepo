import { NextResponse } from "next/server";
import { enqueueReplayJobs } from "@/lib/xp/replay/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const body = await req.json();
    const { user_id, evaluator_key, from_version, to_version, evidence_type, since, until, limit } = body ?? {};

    if (!user_id) return NextResponse.json({ ok: false, error: "user_id required" }, { status: 400 });
    if (!evaluator_key) return NextResponse.json({ ok: false, error: "evaluator_key required" }, { status: 400 });
    if (typeof from_version !== "number" || typeof to_version !== "number") {
        return NextResponse.json({ ok: false, error: "from_version/to_version required" }, { status: 400 });
    }

    const out = await enqueueReplayJobs({
        userId: user_id,
        evaluatorKey: evaluator_key,
        fromVersion: from_version,
        toVersion: to_version,
        evidenceType: evidence_type,
        since,
        until,
        limit,
    });

    return NextResponse.json({ ok: true, ...out });
}
