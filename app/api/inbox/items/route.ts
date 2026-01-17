import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export async function GET(req: Request) {
    const gate = await requireOpsAuth();

    if (!gate.ok) {
        return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const url = new URL(req.url);
    const unread = url.searchParams.get("unread");
    const archived = url.searchParams.get("archived");

    let q = getSupabaseAdminRuntimeClient()
        .from("inbox_items")
        .select("*")
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .order("received_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

    if (unread === "true") q = q.eq("is_unread", true);
    if (archived === "true") q = q.eq("is_archived", true);
    if (archived === "false") q = q.eq("is_archived", false);

    const { data, error } = await q;
    if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, items: data ?? [] });
}
