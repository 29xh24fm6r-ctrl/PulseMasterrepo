import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id, enabled } = (await req.json().catch(() => ({}))) as { id?: string; enabled?: boolean };
  if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });

  const sb = supabaseAdmin();
  const { error } = await sb
    .from("email_autopilot_rules")
    .update({ enabled: !!enabled })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

