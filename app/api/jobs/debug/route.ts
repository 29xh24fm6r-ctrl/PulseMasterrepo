import { NextResponse } from "next/server";
import { jobEnqueue } from "@/lib/jobs/db";
import type { JobName } from "@/lib/jobs/handlers/types";

// Simple admin route to enqueue test jobs
// POST /api/jobs/debug
// Body: { name, payload, user_id }
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, payload, user_id } = body;

        if (!name || !user_id) {
            return NextResponse.json({ error: "Missing name or user_id" }, { status: 400 });
        }

        const job = await jobEnqueue({
            job_type: name as JobName,
            lane: "background",
            payload: payload || {},
            user_id_uuid: user_id,
            owner_user_id: user_id,
        });

        return NextResponse.json({ ok: true, job });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
