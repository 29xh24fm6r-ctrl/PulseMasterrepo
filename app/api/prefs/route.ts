import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data, error } = await supabaseAdmin
        .from("user_prefs")
        .select("*")
        .eq("user_id", userId)
        .single();

    if (error && error.code !== "PGRST116") {
        return NextResponse.json({ error: "prefs_failed", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({
        prefs: data ?? { user_id: userId, focus_mode_enabled: false, active_focus_task_id: null },
    });
}

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = (await req.json()) as Partial<{
        focus_mode_enabled: boolean;
        active_focus_task_id: string | null;
    }>;

    const patch = {
        user_id: userId,
        focus_mode_enabled: !!body.focus_mode_enabled,
        active_focus_task_id: body.active_focus_task_id ?? null,
    };

    const { data, error } = await supabaseAdmin
        .from("user_prefs")
        .upsert(patch, { onConflict: "user_id" })
        .select("*")
        .single();

    if (error) {
        return NextResponse.json({ error: "prefs_update_failed", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ prefs: data });
}
