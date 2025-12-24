// src/app/api/email/drafts/route.ts
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
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") || 50)));
    const status = url.searchParams.get("status"); // optional: draft|approved|sent|discarded

    const sb = sbEmailAdmin();

    let q = sb
      .from("email_drafts")
      .select("id, thread_id, subject, body, status, updated_at, created_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (status) q = q.eq("status", status);

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({ ok: true, drafts: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 400 });
  }
}

