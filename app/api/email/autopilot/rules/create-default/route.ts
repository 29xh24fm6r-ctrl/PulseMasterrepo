import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const sb = supabaseAdmin();

  const { data: existing } = await sb
    .from("email_autopilot_rules")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", "follow_up")
    .eq("triage_label", "waiting_on_them")
    .maybeSingle();

  if (existing?.id) return NextResponse.json({ ok: true, already_exists: true, id: existing.id });

  const { data, error } = await sb
    .from("email_autopilot_rules")
    .insert({
      user_id: userId,
      enabled: true,
      kind: "follow_up",
      triage_label: "waiting_on_them",
      min_confidence: 0.8,
      max_per_day: 10,
      delay_seconds: 0,
      intent: "safe",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

