import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 10), 50);

    const { data, error } = await supabaseAdmin
        .from("tasks_execution_feed" as any)
        .select("*")
        .eq("user_id_uuid", userId)
        .order("is_overdue", { ascending: false })
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("priority", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(limit);

    if (error) {
        return NextResponse.json({ error: "query_failed", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data ?? [] });
}
