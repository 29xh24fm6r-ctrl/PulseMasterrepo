// Persona Fusion API
// app/api/personas/fuse/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { fusePersonas, validateFusion } from "@/lib/personas/fusion";
import { getVoiceProfileByKey } from "@/lib/voices/seed";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { personaAKey, personaBKey, weightA, weightB, name } = body;

    if (!personaAKey || !personaBKey || weightA === undefined || weightB === undefined) {
      return NextResponse.json(
        { error: "personaAKey, personaBKey, weightA, weightB required" },
        { status: 400 }
      );
    }

    // Get personas
    const personaA = await getVoiceProfileByKey(personaAKey);
    const personaB = await getVoiceProfileByKey(personaBKey);

    if (!personaA || !personaB) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    // Fuse
    const fusion = fusePersonas({
      personaA: personaA as any,
      personaB: personaB as any,
      weightA,
      weightB,
    });

    // Validate
    if (!validateFusion(fusion.style)) {
      return NextResponse.json({ error: "Invalid fusion result" }, { status: 400 });
    }

    // Get persona IDs
    const { data: profileA } = await supabaseAdmin
      .from("voice_profiles")
      .select("id")
      .eq("key", personaAKey)
      .single();

    const { data: profileB } = await supabaseAdmin
      .from("voice_profiles")
      .select("id")
      .eq("key", personaBKey)
      .single();

    if (!profileA || !profileB) {
      return NextResponse.json({ error: "Persona IDs not found" }, { status: 404 });
    }

    // Save fusion
    const { data: savedFusion, error } = await supabaseAdmin
      .from("persona_fusions")
      .insert({
        name: name || fusion.name,
        persona_a: profileA.id,
        persona_b: profileB.id,
        weight_a: weightA,
        weight_b: weightB,
        style: fusion.style,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Error saving fusion:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ fusion: savedFusion });
  } catch (err: any) {
    console.error("[PersonasFuse] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fuse personas" },
      { status: 500 }
    );
  }
}




