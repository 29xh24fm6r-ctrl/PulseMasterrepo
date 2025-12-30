import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
    // Simple shared secret so only Vercel Cron can call it
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("user_daily_activity_rollup_refresh");

    if (error) {
        return NextResponse.json(
            { ok: false, error: error.message },
            { status: 500 }
        );
    }

    return NextResponse.json({ ok: true });
}
