// Delete Unknown Speaker API
// app/api/voice/identity/unknown/[id]/route.ts

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

    const unknownId = params.id;

    // Verify ownership
    const { data: unknown } = await supabaseAdmin
      .from("voice_unknown_speakers")
      .select("id")
      .eq("id", unknownId)
      .eq("user_id", dbUserId)
      .single();

    if (!unknown) {
      return NextResponse.json({ error: "Unknown speaker not found" }, { status: 404 });
    }

    // Delete unknown speaker
    await supabaseAdmin.from("voice_unknown_speakers").delete().eq("id", unknownId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[UnknownSpeakerDelete] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete unknown speaker" },
      { status: 500 }
    );
  }
}

