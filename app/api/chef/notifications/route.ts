import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

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
            limit: z.coerce.number().int().min(1).max(50).optional(),
            unread_only: z.coerce.boolean().optional(),
        }).parse({
            limit: url.searchParams.get("limit") ?? undefined,
            unread_only: url.searchParams.get("unread_only") ?? undefined,
        });

        const sb = getSupabaseAdminRuntimeClient();
        let query = sb
            .from("chef_notifications")
            .select("*")
            .eq("owner_user_id", owner_user_id)
            .order("created_at", { ascending: false })
            .limit(q.limit ?? 20);

        if (q.unread_only) query = query.eq("is_read", false);

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ ok: true, notifications: data ?? [] });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const owner_user_id = requireOwnerUserId(req);

        const body = z.object({
            ids: z.array(z.string().uuid()).min(1),
        }).parse(await req.json());

        const sb = getSupabaseAdminRuntimeClient();
        const { error } = await sb
            .from("chef_notifications")
            .update({ is_read: true })
            .eq("owner_user_id", owner_user_id)
            .in("id", body.ids);

        if (error) throw error;

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
    }
}
