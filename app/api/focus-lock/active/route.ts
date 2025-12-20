import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: lock, error } = await supabaseAdmin
    .from("focus_locks")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!lock) return NextResponse.json({ lock: null }, { status: 200 });

  // Auto-expire if ended
  const now = Date.now();
  const ends = new Date(lock.ends_at).getTime();

  if (Number.isFinite(ends) && ends <= now) {
    await supabaseAdmin
      .from("focus_locks")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", lock.id);

    return NextResponse.json({ lock: null }, { status: 200 });
  }

  return NextResponse.json({ lock }, { status: 200 });
}

