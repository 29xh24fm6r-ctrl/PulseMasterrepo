// Persona DNA API
// app/api/personas/dna/[personaId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPersonaDNA, encodePersonaToDNA, savePersonaDNA } from "@/lib/personas/dna";
import { getVoiceProfileByKey } from "@/lib/voices/seed";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: { personaId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const personaId = params.personaId;

    const dna = await getPersonaDNA(personaId);

    if (!dna) {
      // Generate DNA if it doesn't exist
      const { data: personaData } = await supabaseAdmin
        .from("voice_profiles")
        .select("*")
        .eq("id", personaId)
        .single();

      if (!personaData) {
        return NextResponse.json({ error: "Persona not found" }, { status: 404 });
      }

      const persona = {
        id: personaData.id,
        key: personaData.key,
        name: personaData.name,
        description: personaData.description,
        style: personaData.style,
      };

      const newDNA = encodePersonaToDNA(persona as any);
      await savePersonaDNA(personaId, newDNA);

      return NextResponse.json({ dna: newDNA });
    }

    return NextResponse.json({ dna });
  } catch (err: any) {
    console.error("[PersonaDNA] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get DNA" },
      { status: 500 }
    );
  }
}




