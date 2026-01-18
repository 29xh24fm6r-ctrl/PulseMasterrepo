// app/api/memory/attention/recent/route.ts
import { NextRequest } from "next/server";
import { requireOwnerUserId } from "@/lib/auth/requireOwnerUserId";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const owner = requireOwnerUserId(req);
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from("attention_artifacts")
        .select("id,source,artifact_type,content,context,confidence,created_at")
        .eq("owner_user_id", owner)
        .order("created_at", { ascending: false })
        .limit(20);

    if (error) return Response.json({ error: "fetch_failed" }, { status: 500 });
    return Response.json({ items: data ?? [] });
}
