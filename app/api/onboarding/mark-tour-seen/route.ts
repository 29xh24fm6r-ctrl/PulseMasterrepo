// Mark Tour as Seen
// app/api/onboarding/mark-tour-seen/route.ts

import { supabaseServer } from "@/lib/supabase/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const clerkUserId = await requireClerkUserId();
    const supabase = supabaseServer();

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
        user_id: clerkUserId,
      ...updateField,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to mark tour as seen:", error);
      return NextResponse.json({ error: "Failed to update state" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unauthorized" }, { status: 401 });
  }
}




