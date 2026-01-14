import { NextResponse } from "next/server";
import { z } from "zod";
import { updateExecution } from "@/lib/chef/execute/executionStore";
import { supabaseAdmin } from "@/lib/supabase/admin";

function requireOwnerUserId(req: Request): string {
    const owner = req.headers.get("x-owner-user-id");
    if (!owner) throw new Error("Missing x-owner-user-id (temporary dev auth)");
    return owner;
}

const BodySchema = z.object({
    execution_id: z.string().uuid(),
    op: z.enum(["start", "stop", "clear"]),
    label: z.string().min(1).optional(),
    seconds: z.number().int().min(1).max(24 * 60 * 60).optional(),
});

export const runtime = "nodejs";

type Timer = {
    id: string;
    label: string;
    seconds: number;
    started_at: string;
    stopped_at?: string;
};

export async function POST(req: Request) {
    try {
        const owner_user_id = requireOwnerUserId(req);
        const body = BodySchema.parse(await req.json());

        const sb = supabaseAdmin();
        const { data: exec, error: rErr } = await sb
            .from("chef_cook_executions")
            .select("id,timers")
            .eq("id", body.execution_id)
            .eq("owner_user_id", owner_user_id)
            .single();

        if (rErr) throw rErr;

        const timers: Timer[] = Array.isArray(exec.timers) ? exec.timers : [];
        const now = new Date().toISOString();

        if (body.op === "clear") {
            const updated = await updateExecution({
                owner_user_id,
                execution_id: body.execution_id,
                patch: { timers: [] },
            });
            return NextResponse.json({ ok: true, execution: updated });
        }

        if (body.op === "start") {
            if (!body.label || body.seconds == null) {
                return NextResponse.json({ ok: false, error: "start requires label and seconds" }, { status: 400 });
            }

            const t: Timer = {
                id: crypto.randomUUID(),
                label: body.label,
                seconds: body.seconds,
                started_at: now,
            };

            timers.unshift(t);

            const updated = await updateExecution({
                owner_user_id,
                execution_id: body.execution_id,
                patch: { timers },
            });

            return NextResponse.json({ ok: true, execution: updated, timer: t });
        }

        if (body.op === "stop") {
            // Stop most recent running timer
            const idx = timers.findIndex((t) => !t.stopped_at);
            if (idx === -1) {
                return NextResponse.json({ ok: false, error: "No running timer to stop" }, { status: 400 });
            }
            timers[idx] = { ...timers[idx], stopped_at: now };

            const updated = await updateExecution({
                owner_user_id,
                execution_id: body.execution_id,
                patch: { timers },
            });

            return NextResponse.json({ ok: true, execution: updated, timer: timers[idx] });
        }

        return NextResponse.json({ ok: false, error: "Unsupported op" }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
    }
}
