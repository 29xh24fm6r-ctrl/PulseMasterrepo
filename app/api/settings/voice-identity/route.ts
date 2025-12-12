// Voice Identity Settings API
// app/api/settings/voice-identity/route.ts

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
      .from("user_voice_identity_settings")
      .select("*")
      .eq("user_id", dbUserId)
      .maybeSingle();

    return NextResponse.json(
      settings || {
        speaker_identification_enabled: true,
        auto_identify_threshold: 0.85,
        require_consent: true,
      }
    );
  } catch (err: any) {
    console.error("[VoiceIdentitySettings] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get voice identity settings" },
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
      .from("user_voice_identity_settings")
      .upsert(
        {
          user_id: dbUserId,
          speaker_identification_enabled: body.speaker_identification_enabled ?? true,
          auto_identify_threshold: body.auto_identify_threshold ?? 0.85,
          require_consent: body.require_consent ?? true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[VoiceIdentitySettings] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update voice identity settings" },
      { status: 500 }
    );
  }
}

