import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

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

        const { data, error } = await supabaseAdmin
            .from("activity_events")
            .select("id,created_at,source,event_type,title,detail,payload")
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) {
            return NextResponse.json(
                { ok: false, error: "ACTIVITY_FETCH_FAILED", detail: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ ok: true, items: data ?? [] });
    } catch (err: any) {
        return NextResponse.json(
            { ok: false, error: "ACTIVITY_FETCH_FAILED", detail: err?.message ?? String(err) },
            { status: 500 }
        );
    }
}
