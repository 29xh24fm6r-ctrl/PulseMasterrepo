// List All Personas API
// app/api/personas/list/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { seedVoiceProfiles } from "@/lib/voices/seed";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure profiles are seeded
    await seedVoiceProfiles();

    // Get all base personas
    const { data: basePersonas } = await supabaseAdmin
      .from("voice_profiles")
      .select("*")
      .eq("is_generated", false)
      .order("name", { ascending: true });

    // Get all generated personas
    const { data: generatedPersonas } = await supabaseAdmin
      .from("voice_profiles")
      .select("*")
      .eq("is_generated", true)
      .order("name", { ascending: true });

    // Get all fusion personas
    const { data: fusions } = await supabaseAdmin
      .from("persona_fusions")
      .select("*, persona_a:voice_profiles!persona_a(*), persona_b:voice_profiles!persona_b(*)")
      .order("created_at", { ascending: false });

    return NextResponse.json({
      base: basePersonas || [],
      generated: generatedPersonas || [],
      fusions: fusions || [],
    });
  } catch (err: any) {
    console.error("[PersonasList] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to list personas" },
      { status: 500 }
    );
  }
}




