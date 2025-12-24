import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const filter = String(url.searchParams.get("filter") || "needs_reply");

  const sb = supabaseAdmin();

  let q = sb
    .from("email_events")
    .select("id,received_at,from_email,subject,snippet,triage_label,triage_confidence")
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .order("received_at", { ascending: false })
    .limit(50);

  if (filter !== "all") q = q.eq("triage_label", filter);

  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, events: data ?? [] });
}

