import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { readRecipeSteps } from "@/lib/chef/execute/readRecipeSteps";
import { suggestTimersForStep } from "@/lib/chef/execute/suggestTimers";

function requireOwnerUserId(req: Request): string {
    const owner = req.headers.get("x-owner-user-id");
    if (!owner) throw new Error("Missing x-owner-user-id (temporary dev auth)");
    return owner;
}

export const runtime = "nodejs";

export async function GET(req: Request) {
    try {
        const owner_user_id = requireOwnerUserId(req);
        const url = new URL(req.url);

        const q = z.object({
            execution_id: z.string().uuid(),
        }).parse({
            execution_id: url.searchParams.get("execution_id"),
        });

        const sb = supabaseAdmin();

        const { data: exec, error: eErr } = await sb
            .from("chef_cook_executions")
            .select("id, current_step, cook_plan_id")
            .eq("id", q.execution_id)
            .eq("owner_user_id", owner_user_id)
            .single();

        if (eErr) throw eErr;

        const { data: plan, error: pErr } = await sb
            .from("chef_cook_plans")
            .select("id, recipe_id, title")
            .eq("id", exec.cook_plan_id)
            .eq("owner_user_id", owner_user_id)
            .single();

        if (pErr) throw pErr;

        const stepIdx = Number(exec.current_step ?? 0);

        if (!plan.recipe_id) {
            return NextResponse.json({
                ok: true,
                step: stepIdx,
                step_text: null,
                suggestions: [{ label: "2 min", seconds: 120 }, { label: "5 min", seconds: 300 }],
            });
        }

        const recipe = await readRecipeSteps(plan.recipe_id);
        const stepText = recipe.steps?.[stepIdx] ?? "";
        const suggestions = suggestTimersForStep(stepText);

        return NextResponse.json({ ok: true, step: stepIdx, step_text: stepText, suggestions });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
    }
}
