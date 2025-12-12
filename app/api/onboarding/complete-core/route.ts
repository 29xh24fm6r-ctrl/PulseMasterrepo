// Mark Core Onboarding Complete
// app/api/onboarding/complete-core/route.ts

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Upsert onboarding state
  const { error } = await supabase
    .from("user_onboarding_state")
    .upsert({
      user_id: user.id,
      has_completed_core: true,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error("Failed to update onboarding state:", error);
    return NextResponse.json({ error: "Failed to update state" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}




