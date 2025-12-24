// src/app/api/email/followups/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sbEmailAdmin } from "@/lib/email/db";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireUserId(): Promise<string> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");

  // Resolve Clerk ID to DB user_id
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .maybeSingle();

  return userRow?.id ?? clerkUserId;
}

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get("limit") || 100)));
    const status = url.searchParams.get("status"); // scheduled|done|canceled

    const sb = sbEmailAdmin();

    let q = sb
      .from("email_followups")
      .select("id, thread_id, follow_up_at, reason, status, created_at, updated_at")
      .eq("user_id", userId)
      .order("follow_up_at", { ascending: true })
      .limit(limit);

    if (status) q = q.eq("status", status);

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({ ok: true, followups: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 400 });
  }
}
