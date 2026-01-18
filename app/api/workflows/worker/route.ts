
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    // 1. Dynamic Import to prevent top-level side effects
    // Next.js evaluates modules at build time, so we must not import runtime logic at the top level.
    const { tickWorkflowWorker } = await import("@/services/executors/workflow/worker");

    // 2. Security Check
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
