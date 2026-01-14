import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveExecution, startExecution } from "@/lib/chef/execute/executionStore";

function requireOwnerUserId(req: Request): string {
    const owner = req.headers.get("x-owner-user-id");
    if (!owner) throw new Error("Missing x-owner-user-id (temporary dev auth)");
    return owner;
}

const BodySchema = z.object({
    cook_plan_id: z.string().uuid(),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const owner_user_id = requireOwnerUserId(req);
        const body = BodySchema.parse(await req.json());

        const active = await getActiveExecution({ owner_user_id });
        if (active) {
            return NextResponse.json({ ok: true, execution: active, note: "Execution already active." });
        }

        const execution = await startExecution({
            owner_user_id,
            cook_plan_id: body.cook_plan_id,
        });

        return NextResponse.json({ ok: true, execution });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
    }
}
