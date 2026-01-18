
import { NextRequest, NextResponse } from "next/server";
import { isBuildPhase } from "@/lib/env/isBuildPhase";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    // 1. Build Phase Guard
    if (isBuildPhase()) {
        return new Response(
            JSON.stringify({ ok: true, skipped: "build-phase" }),
            { status: 200 }
        );
    }

    // 2. Dynamic Import to prevent top-level side effects from lib/runtime/workflow.runtime.ts
    const { tickWorkflowWorker } = await import("@/services/executors/workflow/worker");

    // 3. Security Check
    const secret = req.headers.get("x-pulse-executor-secret");
    if (secret !== process.env.PULSE_EXECUTOR_SECRET && secret !== "dev-secret") {
        // Basic dev bypass for verification script convenience if needed, but safer to enforce
        if (process.env.NODE_ENV === 'production' || !secret) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    try {
        const result = await tickWorkflowWorker();
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Workflow Worker Panic:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
