// Mark Tour as Seen
// app/api/onboarding/mark-tour-seen/route.ts

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { tour } = body;

  const updateField: Record<string, boolean> = {};
  if (tour === "life_dashboard") {
    updateField.has_seen_life_tour = true;
  } else if (tour === "work_dashboard") {
    updateField.has_seen_work_tour = true;
  } else if (tour === "finance_page") {
    updateField.has_seen_finance_tour = true;
  } else if (tour === "relationships_page") {
    updateField.has_seen_relationships_tour = true;
  }

  const { error } = await supabase
    .from("user_onboarding_state")
    .upsert({
      user_id: user.id,
      ...updateField,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error("Failed to mark tour as seen:", error);
    return NextResponse.json({ error: "Failed to update state" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}




