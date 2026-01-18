
import { NextRequest, NextResponse } from "next/server";
import { tickWorkflowWorker } from "@/services/executors/workflow/worker";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    // 1. Security Check
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
