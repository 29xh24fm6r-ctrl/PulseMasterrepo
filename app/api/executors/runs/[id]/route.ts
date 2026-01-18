import { NextRequest } from "next/server";
import { requireOwnerUserId } from "@/lib/auth/requireOwnerUserId";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const owner = requireOwnerUserId(req);
    const supabase = getSupabaseAdmin();

    const { data: run } = await supabase
        .from("exec_runs")
        .select(`
            *,
            exec_steps (*)
        `)
        .eq("id", params.id)
        .eq("owner_user_id", owner)
        .single();

    if (!run) return new Response("Not Found", { status: 404 });

    return Response.json(run);
}
