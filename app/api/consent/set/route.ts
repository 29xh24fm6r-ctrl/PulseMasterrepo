import { NextRequest } from "next/server";
import { requireOwnerUserId } from "@/lib/auth/requireOwnerUserId";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const owner = requireOwnerUserId(req);
    const { consent_type, granted, scope } = await req.json();

    const supabase = getSupabaseAdmin();

    await supabase.from("pulse_consents").insert({
        owner_user_id: owner,
        consent_type,
        scope,
        granted,
        granted_at: granted ? new Date().toISOString() : null,
        revoked_at: granted ? null : new Date().toISOString(),
    });

    return Response.json({ ok: true });
}
