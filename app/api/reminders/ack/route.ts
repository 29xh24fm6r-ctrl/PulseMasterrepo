import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });

  const sb = supabaseAdmin();
  const { error } = await sb
    .from("reminder_subscriptions")
    .update({
      active: false,
      handled_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

