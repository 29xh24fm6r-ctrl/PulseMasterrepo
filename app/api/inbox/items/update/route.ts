import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(req: Request) {
    const gate = await requireOpsAuth();

    if (!gate.ok) {
        return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const body = await req.json().catch(() => ({}));

    const id = body?.id as string | undefined;
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const patch: any = {};
    if (typeof body.is_unread === "boolean") patch.is_unread = body.is_unread;
    if (typeof body.is_archived === "boolean") patch.is_archived = body.is_archived;

    const { data, error } = await supabaseAdmin
        .from("inbox_items")
        .update(patch)
        .eq("id", id)
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .select("*")
        .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, item: data });
}
