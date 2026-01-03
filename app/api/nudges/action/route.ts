import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { withOpsGuard } from "@/lib/api/opsGuard";

export async function POST(req: Request) {
    const authResult = await requireOpsAuth();
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const { userId: owner_user_id } = authResult;

    return withOpsGuard(
        req,
        owner_user_id,
        {
            routeKey: "POST:/api/nudges/action",
            windowSeconds: 60,
            limit: 60,
        },
        async () => {
            const body = await req.json();
            const { nudge_id, action } = body as { nudge_id: string; action: "shown" | "dismiss" };

            if (!nudge_id || !action) {
                return { status: 400, body: { error: "Missing nudge_id/action" } };
            }

            const supa = supabaseAdmin;

            if (action === "shown") {
                const { error } = await supa.rpc("nudge_mark_shown", { p_nudge_id: nudge_id });
                if (error) return { status: 500, body: { error: error.message } };
            } else {
                const { error } = await supa.rpc("nudge_dismiss", { p_nudge_id: nudge_id });
                if (error) return { status: 500, body: { error: error.message } };
            }

            return { status: 200, body: { ok: true } };
        }
    );
}
