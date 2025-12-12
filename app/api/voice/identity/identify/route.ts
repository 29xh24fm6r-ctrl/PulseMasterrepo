// Identify Unknown Speaker API
// app/api/voice/identity/identify/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { unknownSpeakerId, contactId, contactName } = body;

    if (!unknownSpeakerId) {
      return NextResponse.json(
        { error: "unknownSpeakerId is required" },
        { status: 400 }
      );
    }

    // Get unknown speaker
    const { data: unknownSpeaker } = await supabaseAdmin
      .from("voice_unknown_speakers")
      .select("embedding")
      .eq("id", unknownSpeakerId)
      .eq("user_id", dbUserId)
      .single();

    if (!unknownSpeaker) {
      return NextResponse.json({ error: "Unknown speaker not found" }, { status: 404 });
    }

    // Create voice profile
    const { data: voiceProfile } = await supabaseAdmin
      .from("voice_profiles")
      .insert({
        user_id: dbUserId,
        contact_id: contactId || null,
        contact_name: contactName || null,
        embedding: unknownSpeaker.embedding,
      })
      .select("id")
      .single();

    if (!voiceProfile) {
      return NextResponse.json({ error: "Failed to create voice profile" }, { status: 500 });
    }

    // Update all comm_message_speakers that reference this unknown speaker
    await supabaseAdmin
      .from("comm_message_speakers")
      .update({
        speaker_profile_id: voiceProfile.id,
        unknown_speaker_id: null,
      })
      .eq("unknown_speaker_id", unknownSpeakerId);

    // Delete unknown speaker
    await supabaseAdmin
      .from("voice_unknown_speakers")
      .delete()
      .eq("id", unknownSpeakerId);

    return NextResponse.json({
      success: true,
      voiceProfileId: voiceProfile.id,
    });
  } catch (err: any) {
    console.error("[VoiceIdentity] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to identify speaker" },
      { status: 500 }
    );
  }
}

