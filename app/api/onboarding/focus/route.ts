// Save User Focus Profile
// app/api/onboarding/focus/route.ts

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { primaryFocus, secondaryFocus, selfDescription } = body;

  const { error } = await supabase
    .from("user_focus_profile")
    .upsert({
      user_id: user.id,
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
}




