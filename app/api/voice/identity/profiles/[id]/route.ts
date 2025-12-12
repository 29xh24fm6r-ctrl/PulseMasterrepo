// Delete Voice Profile API
// app/api/voice/identity/profiles/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    const profileId = params.id;

    // Verify ownership
    const { data: profile } = await supabaseAdmin
      .from("voice_profiles")
      .select("id")
      .eq("id", profileId)
      .eq("user_id", dbUserId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Delete profile
    await supabaseAdmin.from("voice_profiles").delete().eq("id", profileId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[VoiceProfileDelete] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete voice profile" },
      { status: 500 }
    );
  }
}

