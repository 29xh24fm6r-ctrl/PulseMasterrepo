// Audio Settings API
// app/api/settings/audio/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
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

    const { data: settings } = await supabaseAdmin
      .from("user_audio_settings")
      .select("*")
      .eq("user_id", dbUserId)
      .maybeSingle();

    return NextResponse.json(
      settings || {
        audio_capture_enabled: false,
        require_manual_start: true,
        auto_upload_meetings: false,
        delete_audio_after_transcription: false,
        mask_speaker_names: false,
      }
    );
  } catch (err: any) {
    console.error("[AudioSettings] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get audio settings" },
      { status: 500 }
    );
  }
}

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

    await supabaseAdmin
      .from("user_audio_settings")
      .upsert(
        {
          user_id: dbUserId,
          audio_capture_enabled: body.audio_capture_enabled ?? false,
          require_manual_start: body.require_manual_start ?? true,
          auto_upload_meetings: body.auto_upload_meetings ?? false,
          delete_audio_after_transcription: body.delete_audio_after_transcription ?? false,
          mask_speaker_names: body.mask_speaker_names ?? false,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[AudioSettings] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update audio settings" },
      { status: 500 }
    );
  }
}

