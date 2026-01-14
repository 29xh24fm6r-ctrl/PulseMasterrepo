import { NextResponse } from "next/server";
import { z } from "zod";
import { computeStartCookAt } from "@/lib/chef/schedule/compute";
import { readRecipeTimeDefaults } from "@/lib/chef/schedule/readRecipeTime";
import { createCookPlan } from "@/lib/chef/schedule/writeCookPlan";

function requireOwnerUserId(req: Request): string {
    const owner = req.headers.get("x-owner-user-id");
    if (!owner) throw new Error("Missing x-owner-user-id (temporary dev auth)");
    return owner;
}

const BodySchema = z.object({
    target_eat_at: z.string().datetime(), // ISO string

    // Either specify recipe_id OR provide times directly
    recipe_id: z.string().uuid().optional(),

    title: z.string().min(1).optional(), // required if no recipe_id

    prep_minutes: z.number().int().min(0).max(1440).optional(),
    cook_minutes: z.number().int().min(0).max(1440).optional(),

    buffer_minutes: z.number().int().min(0).max(240).optional(),
    user_speed_modifier: z.number().min(0.25).max(3).optional(),

    meta: z.any().optional(),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const owner_user_id = requireOwnerUserId(req);
        const body = BodySchema.parse(await req.json());

        const target = new Date(body.target_eat_at);
        if (Number.isNaN(target.getTime())) {
            return NextResponse.json({ ok: false, error: "Invalid target_eat_at" }, { status: 400 });
        }

        let title = body.title ?? "Cook";
        let prep = body.prep_minutes ?? 0;
        let cook = body.cook_minutes ?? 0;

        if (body.recipe_id) {
            const r = await readRecipeTimeDefaults(body.recipe_id);
            title = r.title;
            prep = r.prep_minutes;
            cook = r.cook_minutes;
        } else {
            if (!body.title) {
                return NextResponse.json({ ok: false, error: "title is required when recipe_id is not provided" }, { status: 400 });
            }
            if (body.prep_minutes == null && body.cook_minutes == null) {
                return NextResponse.json({ ok: false, error: "prep_minutes/cook_minutes required when recipe_id is not provided" }, { status: 400 });
            }
        }

        const buffer = body.buffer_minutes ?? 5;
        const speed = body.user_speed_modifier ?? 1.0;

        const start = computeStartCookAt({
            target_eat_at: target,
            prep_minutes: prep,
            cook_minutes: cook,
            buffer_minutes: buffer,
            user_speed_modifier: speed,
        });

        const plan = await createCookPlan({
            owner_user_id,
            recipe_id: body.recipe_id ?? null,
            title,
            target_eat_at: target.toISOString(),
            start_cook_at: start.toISOString(),
            prep_minutes: prep,
            cook_minutes: cook,
            buffer_minutes: buffer,
            user_speed_modifier: speed,
            meta: body.meta ?? {},
        });

        return NextResponse.json({
            ok: true,
            cook_plan: plan,
            computed: {
                target_eat_at: target.toISOString(),
                start_cook_at: start.toISOString(),
                total_minutes: Math.round(((prep + cook) * speed) + buffer),
            },
            next: {
                phase_6: "Execution Mode: when now >= start_cook_at, prompt user and start chef_cook_executions",
            },
        });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
    }
}
