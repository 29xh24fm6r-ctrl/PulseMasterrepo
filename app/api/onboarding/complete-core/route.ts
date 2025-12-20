// Mark Core Onboarding Complete
// app/api/onboarding/complete-core/route.ts

import { supabaseServer } from "@/lib/supabase/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const clerkUserId = await requireClerkUserId();
    const supabase = supabaseServer();

    // Upsert onboarding state
    const { error } = await supabase
      .from("user_onboarding_state")
      .upsert({
        user_id: clerkUserId,
        has_completed_core: true,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Failed to update onboarding state:", error);
      return NextResponse.json({ error: "Failed to update state" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unauthorized" }, { status: 401 });
  }
}




