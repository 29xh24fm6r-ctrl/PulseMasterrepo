import { NextResponse } from "next/server";
import { readNextCookPlan } from "@/lib/chef/execute/readNextPlan";
import { getActiveExecution } from "@/lib/chef/execute/executionStore";
import { readRecipeSteps } from "@/lib/chef/execute/readRecipeSteps";

function requireOwnerUserId(req: Request): string {
    const owner = req.headers.get("x-owner-user-id");
    if (!owner) throw new Error("Missing x-owner-user-id (temporary dev auth)");
    return owner;
}

export const runtime = "nodejs";

export async function GET(req: Request) {
    try {
        const owner_user_id = requireOwnerUserId(req);

        const active = await getActiveExecution({ owner_user_id });
        if (active) {
            return NextResponse.json({ ok: true, mode: "active", active_execution: active });
        }

        const plan = await readNextCookPlan({ owner_user_id });
        if (!plan) return NextResponse.json({ ok: true, mode: "none" });

        const now = Date.now();
        const startMs = new Date(plan.start_cook_at).getTime();
        const targetMs = new Date(plan.target_eat_at).getTime();

        const goTime = !Number.isNaN(startMs) && now >= startMs;
        const starts_in_minutes = Number.isNaN(startMs) ? null : Math.round((startMs - now) / 60000);
        const eat_in_minutes = Number.isNaN(targetMs) ? null : Math.round((targetMs - now) / 60000);

        let recipe_steps: any = null;
        if (plan.recipe_id) {
            recipe_steps = await readRecipeSteps(plan.recipe_id);
        }

        return NextResponse.json({
            ok: true,
            mode: "plan",
            plan,
            go_time: goTime,
            starts_in_minutes,
            eat_in_minutes,
            recipe_steps,
        });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
    }
}
