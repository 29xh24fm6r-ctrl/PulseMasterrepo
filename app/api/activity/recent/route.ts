// app/api/activity/recent/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/activity/recent?limit=10
 * Returns last N activity events.
 * NOTE: user scoping can be added later: .eq("user_id", <authUserId>)
 */
export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const limitRaw = url.searchParams.get("limit");
        const limit = Math.min(Math.max(Number(limitRaw ?? 10) || 10, 1), 50);

        // Updated Schema Selection
        // Old: source, event_type, title, detail, payload
        // New Schema: source, action, category, metadata
        const { data, error } = await getSupabaseAdminRuntimeClient()
            .from("activity_events")
            .select("id,created_at,source,action,category,metadata")
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) {
            return NextResponse.json(
                { ok: false, error: "ACTIVITY_FETCH_FAILED", detail: error.message },
                { status: 500 }
            );
        }

        // Map to expected frontend format (ActivityEvent)
        const items = (data ?? []).map((row: any) => {
            const meta = (row.metadata as any) || {};
            return {
                id: row.id,
                created_at: row.created_at,
                source: row.source,
                event_type: row.category, // Map category -> event_type
                title: meta.title || row.action, // Map action -> title (or metadata.title)
                detail: meta.detail || meta.description || null,
                payload: meta.payload || meta, // Fallback
            };
        });

        return NextResponse.json({ ok: true, items });
    } catch (err: any) {
        return NextResponse.json(
            { ok: false, error: "ACTIVITY_FETCH_FAILED", detail: err?.message ?? String(err) },
            { status: 500 }
        );
    }
}
