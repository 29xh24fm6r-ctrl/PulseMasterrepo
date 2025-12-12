// Coach Preferences API
// app/api/coaches/preferences/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { CoachUserPreferences } from "@/lib/coaches/types";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const coachType = searchParams.get("coachType") || "sales";

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Get preferences
    const { data, error } = await supabaseAdmin
      .from("coach_user_preferences")
      .select("coach_type, tone, difficulty_pref")
      .eq("user_id", dbUserId)
      .eq("coach_type", coachType)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (data) {
      return NextResponse.json({
        preferences: {
          coachType: data.coach_type,
          tone: data.tone,
          difficultyPref: data.difficulty_pref,
        } as CoachUserPreferences,
      });
    }

    // Return defaults if no preferences found
    return NextResponse.json({
      preferences: {
        coachType,
        tone: "supportive",
        difficultyPref: "auto",
      } as CoachUserPreferences,
    });
  } catch (err: any) {
    console.error("[CoachPreferences] GET error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch preferences" },
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
    const { coachType, tone, difficultyPref } = body;

    if (!coachType || !tone || !difficultyPref) {
      return NextResponse.json(
        { error: "Missing required fields: coachType, tone, difficultyPref" },
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

    // Upsert preferences
    const { data, error } = await supabaseAdmin
      .from("coach_user_preferences")
      .upsert(
        {
          user_id: dbUserId,
          coach_type: coachType,
          tone,
          difficulty_pref: difficultyPref,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,coach_type",
        }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      preferences: {
        coachType: data.coach_type,
        tone: data.tone,
        difficultyPref: data.difficulty_pref,
      } as CoachUserPreferences,
    });
  } catch (err: any) {
    console.error("[CoachPreferences] POST error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to save preferences" },
      { status: 500 }
    );
  }
}

