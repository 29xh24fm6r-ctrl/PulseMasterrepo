import { NextResponse } from "next/server";
import { z } from "zod";
import { updateExecution } from "@/lib/chef/execute/executionStore";

function requireOwnerUserId(req: Request): string {
    const owner = req.headers.get("x-owner-user-id");
    if (!owner) throw new Error("Missing x-owner-user-id (temporary dev auth)");
    return owner;
}

const BodySchema = z.object({
    execution_id: z.string().uuid(),
    op: z.enum(["set", "next", "prev"]),
    value: z.number().int().min(0).optional(),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const owner_user_id = requireOwnerUserId(req);
        const body = BodySchema.parse(await req.json());

        // Fetch current to compute next/prev safely (V1 minimal)
        // We can avoid an extra read by letting client send "set" mostly.
        // For next/prev we do a read to avoid drift.
        // Simpler: require client to send "set" always. But we support all 3.
        // We'll implement a tiny read here:
        // NOTE: to keep file count low, we inline a supabaseAdmin read.
        const { supabaseAdmin } = await import("@/lib/supabase/admin");
        const sb = supabaseAdmin();

        const { data: current, error: rErr } = await sb
            .from("chef_cook_executions")
            .select("id,current_step")
            .eq("id", body.execution_id)
            .eq("owner_user_id", owner_user_id)
            .single();

        if (rErr) throw rErr;

        let nextStep = Number(current.current_step ?? 0);

        if (body.op === "set") {
            if (body.value == null) throw new Error("op=set requires value");
            nextStep = body.value;
        } else if (body.op === "next") {
            nextStep = nextStep + 1;
        } else if (body.op === "prev") {
            nextStep = Math.max(0, nextStep - 1);
        }

        const updated = await updateExecution({
            owner_user_id,
            execution_id: body.execution_id,
            patch: { current_step: nextStep },
        });

        return NextResponse.json({ ok: true, execution: updated });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
    }
}
