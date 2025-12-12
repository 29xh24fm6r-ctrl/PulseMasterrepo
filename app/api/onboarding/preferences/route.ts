// Save Dashboard Preferences
// app/api/onboarding/preferences/route.ts

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const { error } = await supabase
    .from("user_dashboard_preferences")
    .upsert({
      user_id: user.id,
      show_tasks_focus: body.show_tasks_focus ?? true,
      show_money_snapshot: body.show_money_snapshot ?? true,
      show_relationships: body.show_relationships ?? true,
      show_strategy_xp: body.show_strategy_xp ?? true,
      show_energy_mood: body.show_energy_mood ?? true,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error("Failed to save preferences:", error);
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}




