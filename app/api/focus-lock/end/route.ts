import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabaseAdmin
    .from("focus_locks")
    .update({ status: "ended", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "active");

  return new NextResponse(null, { status: 204 });
}

