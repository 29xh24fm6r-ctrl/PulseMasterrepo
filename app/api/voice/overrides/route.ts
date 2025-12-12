// Voice Overrides API
// app/api/voice/overrides/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export interface VoiceOverride {
  id: string;
  user_id: string;
  coach_id: string;
  emotion: string;
  override_voice: string;
  speed_override?: number | null;
  energy_override?: number | null;
  warmth_override?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

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

    const { data: overrides, error } = await supabaseAdmin
      .from("voice_emotion_overrides")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[VoiceOverrides] GET error:", error);
      return NextResponse.json(
        { error: "Failed to fetch overrides" },
        { status: 500 }
      );
    }

    return NextResponse.json({ overrides: overrides || [] });
  } catch (err: any) {
    console.error("[VoiceOverrides] GET exception:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
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
    const { coach_id, emotion, override_voice, speed_override, energy_override, warmth_override } = body;

    if (!coach_id || !emotion || !override_voice) {
      return NextResponse.json(
        { error: "coach_id, emotion, and override_voice are required" },
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

    // Upsert override (unique on user_id, coach_id, emotion)
    const { data: override, error } = await supabaseAdmin
      .from("voice_emotion_overrides")
      .upsert(
        {
          user_id: dbUserId,
          coach_id,
          emotion,
          override_voice,
          speed_override: speed_override || null,
          energy_override: energy_override || null,
          warmth_override: warmth_override || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,coach_id,emotion",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("[VoiceOverrides] POST error:", error);
      return NextResponse.json(
        { error: "Failed to save override" },
        { status: 500 }
      );
    }

    return NextResponse.json({ override });
  } catch (err: any) {
    console.error("[VoiceOverrides] POST exception:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    const { error } = await supabaseAdmin
      .from("voice_emotion_overrides")
      .delete()
      .eq("id", id)
      .eq("user_id", dbUserId);

    if (error) {
      console.error("[VoiceOverrides] DELETE error:", error);
      return NextResponse.json(
        { error: "Failed to delete override" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[VoiceOverrides] DELETE exception:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

