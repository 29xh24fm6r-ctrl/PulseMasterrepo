import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export async function POST(req: Request) {
    const gate = await requireOpsAuth();

    if (!gate.ok) {
        return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const now = new Date().toISOString();
    const rows = [
        {
            user_id_uuid: gate.canon.userIdUuid,
            source: "manual",
            from_email: "client@example.com",
            from_name: "Client",
            subject: "Need update on proposal",
            snippet: "Hey Matt — can you send the revised numbers?",
            body: "Hey Matt — can you send the revised numbers? Thanks.",
            received_at: now,
            is_unread: true,
            meta: { demo: true },
        },
        {
            user_id_uuid: gate.canon.userIdUuid,
            source: "manual",
            from_email: "vendor@example.com",
            from_name: "Vendor",
            subject: "Invoice due",
            snippet: "Invoice #123 is due next week.",
            body: "Invoice #123 is due next week. Please confirm payment timing.",
            received_at: now,
            is_unread: true,
            meta: { demo: true },
        },
    ];

    const { data, error } = await getSupabaseAdminRuntimeClient().from("inbox_items").insert(rows).select("*");
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, items: data ?? [] });
}
