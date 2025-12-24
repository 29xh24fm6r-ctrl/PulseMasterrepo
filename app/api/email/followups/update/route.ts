// src/app/api/email/followups/update/route.ts
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

type Body = { id: string; status: "scheduled" | "done" | "canceled" };

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json()) as Body;
    if (!body?.id) throw new Error("missing_id");

    const sb = sbEmailAdmin();

    const { data, error } = await sb
      .from("email_followups")
      .update({ status: body.status })
      .eq("id", body.id)
      .eq("user_id", userId)
      .select("id, thread_id, status")
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("followup_not_found");

    // If marking done, lightly reflect in triage (don't mark done automatically; just remove followup emphasis)
    if (body.status === "done") {
      await sb
        .from("email_triage_items")
        .update({ suggested_action: "reply" })
        .eq("user_id", userId)
        .eq("email_thread_id", data.thread_id);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 400 });
  }
}

