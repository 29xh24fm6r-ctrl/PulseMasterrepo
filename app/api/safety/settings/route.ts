// User Safety Settings API
// app/api/safety/settings/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserSafetySettings } from "@/lib/safety/user-preferences";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getUserSafetySettings(userId);

    return NextResponse.json({ settings });
  } catch (err: any) {
    console.error("[SafetySettings] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get safety settings" },
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
    const { allow_mature_but_nonsexual, allow_direct_language, tone_sensitivity } = body;

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Upsert settings
    const { data: settings, error } = await supabaseAdmin
      .from("user_safety_settings")
      .upsert(
        {
          user_id: dbUserId,
          allow_mature_but_nonsexual: allow_mature_but_nonsexual || false,
          allow_direct_language: allow_direct_language !== undefined ? allow_direct_language : true,
          tone_sensitivity: tone_sensitivity || "normal",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      )
      .select("*")
      .single();

    if (error) {
      console.error("Error updating safety settings:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings });
  } catch (err: any) {
    console.error("[SafetySettings] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update safety settings" },
      { status: 500 }
    );
  }
}




