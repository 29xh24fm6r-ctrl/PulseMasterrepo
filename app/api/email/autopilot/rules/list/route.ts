import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { autopilotEnabled } from "@/lib/email/autopilot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!autopilotEnabled()) return NextResponse.json({ ok: false, error: "autopilot_disabled" }, { status: 400 });

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("email_autopilot_rules")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, rules: data ?? [] });
}

