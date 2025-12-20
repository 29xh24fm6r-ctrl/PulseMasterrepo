// Save User Focus Profile
// app/api/onboarding/focus/route.ts

import { supabaseServer } from "@/lib/supabase/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const clerkUserId = await requireClerkUserId();
    const supabase = supabaseServer();

    const body = await request.json();
    const { primaryFocus, secondaryFocus, selfDescription } = body;

    const { error } = await supabase
      .from("user_focus_profile")
      .upsert({
        user_id: clerkUserId,
      primary_focus: primaryFocus || null,
      secondary_focus: secondaryFocus || null,
      self_description: selfDescription || null,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to save focus profile:", error);
      return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unauthorized" }, { status: 401 });
  }
}




