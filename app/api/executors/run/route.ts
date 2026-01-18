import { NextRequest } from "next/server";
import { requireOwnerUserId } from "@/lib/auth/requireOwnerUserId";
import { createExecution, enqueueJob } from "@/services/executors/ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const owner = requireOwnerUserId(req);
    const body = await req.json();

    // 1. Create Run Record
    const result = await createExecution({
        owner_user_id: owner,
        run_kind: body.run_kind,
        request: body.request,
        idempotency_key: body.idempotency_key
    });

    // 2. Enqueue Async Job if new
    if (result.is_new) {
        await enqueueJob({
            run_id: result.run_id,
            job_kind: body.run_kind, // Direct mapping for now
            payload: body.request
        });
    }

    return Response.json(result);
}
