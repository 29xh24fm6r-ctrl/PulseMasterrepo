import { NextRequest } from "next/server";
import { logStep } from "@/services/executors/ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const runId = req.nextUrl.searchParams.get("run_id");

    if (runId) {
        const status = formData.get("CallStatus");
        const duration = formData.get("CallDuration");
        const recording = formData.get("RecordingUrl");

        await logStep(runId, "call_update", { status, duration, recording });
    }

    return new Response("OK");
}
