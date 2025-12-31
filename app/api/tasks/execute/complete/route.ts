import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { bumpScore } from "@/lib/work/scoreboard";
import { logActivity } from "@/lib/activity/logActivity";

export async function POST(req: Request) {
    const gate = await requireOpsAuth();

    if (!gate.ok) {
        return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const body = await req.json().catch(() => ({}));
    const id = body?.id as string | undefined;
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const upd = await supabaseAdmin
        .from("tasks")
        .update({ status: "done" })
        .eq("id", id)
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .select("*")
        .single();

    if (upd.error) return NextResponse.json({ ok: false, error: upd.error.message }, { status: 500 });

    await bumpScore({ userIdUuid: gate.canon.userIdUuid, field: "tasks_done_count" });

    await logActivity({
        userId: gate.canon.userIdUuid,
        eventName: "task.completed",
        source: "api",
        entityType: "task",
        entityId: String(id),
        metadata: { title: upd.data.title }
    });

    return NextResponse.json({ ok: true, task: upd.data });
}
