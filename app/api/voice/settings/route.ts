// Voice Settings API
// app/api/voice/settings/route.ts

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
      .from("user_voice_settings")
      .select("preferred_coach_voice")
      .eq("user_id", dbUserId)
      .maybeSingle();

    return NextResponse.json({
      preferred_coach_voice: settings?.preferred_coach_voice || {},
    });
  } catch (err: unknown) {
    console.error("[VoiceSettings] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to get voice settings";
    return NextResponse.json(
      { error: errorMessage },
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

    const body = await req.json();
    const { preferred_coach_voice } = body;

    // Validate input
    if (preferred_coach_voice && typeof preferred_coach_voice !== 'object') {
      return NextResponse.json(
        { error: "preferred_coach_voice must be an object" },
        { status: 400 }
      );
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    await supabaseAdmin
      .from("user_voice_settings")
      .upsert(
        {
          user_id: dbUserId,
          preferred_coach_voice: preferred_coach_voice || {},
        },
        {
          onConflict: "user_id",
        }
      );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[VoiceSettings] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to save voice settings";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
