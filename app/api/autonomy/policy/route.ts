import { NextRequest } from "next/server";
import { requireOwnerUserId } from "@/lib/auth/requireOwnerUserId";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const owner = requireOwnerUserId(req);
    const body = await req.json();
    const { intent_type, autonomy_level } = body;

    if (!['none', 'l0', 'l1'].includes(autonomy_level)) {
        return new Response("Invalid level", { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    await supabase.from("autonomy_scores").upsert({
        owner_user_id: owner,
        intent_type,
        autonomy_level,
        updated_at: new Date().toISOString()
    }, { onConflict: "owner_user_id, intent_type" });

    return Response.json({ success: true });
}
