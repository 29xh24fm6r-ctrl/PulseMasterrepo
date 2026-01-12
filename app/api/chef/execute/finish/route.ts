import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { finishExecution } from "@/lib/chef/execute/executionStore";
import { recordCookingLearning } from "@/lib/chef/learning/updateSpeedModifier";

function requireOwnerUserId(req: Request): string {
    const owner = req.headers.get("x-owner-user-id");
    if (!owner) throw new Error("Missing x-owner-user-id (temporary dev auth)");
    return owner;
}

const BodySchema = z.object({
    execution_id: z.string().uuid(),
    cook_plan_id: z.string().uuid(),
    status: z.enum(["completed", "cancelled"]).default("completed"),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const owner_user_id = requireOwnerUserId(req);
        const body = BodySchema.parse(await req.json());

        // Read started_at before finishing
        const sb = supabaseAdmin();
        const { data: exec, error: eErr } = await sb
            .from("chef_cook_executions")
            .select("id, started_at")
            .eq("id", body.execution_id)
            .eq("owner_user_id", owner_user_id)
            .single();

        if (eErr) throw eErr;

        const res = await finishExecution({
            owner_user_id,
            execution_id: body.execution_id,
            cook_plan_id: body.cook_plan_id,
            status: body.status,
        });

        let learning: any = null;

        // Only learn on completed (not cancelled)
        if (body.status === "completed") {
            learning = await recordCookingLearning({
                owner_user_id,
                cook_plan_id: body.cook_plan_id,
                execution_id: body.execution_id,
                started_at: exec.started_at,
                finished_at: res.finished_at,
            });
        }

        return NextResponse.json({ ok: true, finished_at: res.finished_at, learning });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
    }
}
