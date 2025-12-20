import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const minutes = clamp(Number(body?.minutes ?? 45), 15, 180);

  const playbook_title = typeof body?.playbook_title === "string" ? body.playbook_title : null;
  const playbook_do = typeof body?.playbook_do === "string" ? body.playbook_do : null;

  // End any existing active lock first (idempotent)
  await supabaseAdmin
    .from("focus_locks")
    .update({ status: "ended", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "active");

  const endsAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("focus_locks")
    .insert({
      user_id: userId,
      status: "active",
      ends_at: endsAt,
      minutes,
      playbook_title,
      playbook_do,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ lock: data }, { status: 200 });
}

