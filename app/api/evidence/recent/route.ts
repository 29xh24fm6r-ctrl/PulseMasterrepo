import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const user_id = url.searchParams.get("user_id");
    const limit = Number(url.searchParams.get("limit") ?? 12);

    if (!user_id) return NextResponse.json({ ok: false, error: "user_id required" }, { status: 400 });

    const { data, error } = await supabaseAdmin
        .from("life_evidence")
        .select("id,evidence_type,evidence_payload,confidence,source,created_at")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(Math.min(50, Math.max(1, limit)));

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, items: data ?? [] });
}
