// Persona Evolution API
// app/api/personas/evolve/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getEvolvedPersona } from "@/lib/personas/evolution";
import { EvolutionStage } from "@/lib/personas/types";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const personaKey = searchParams.get("personaKey");
    const stage = searchParams.get("stage") as EvolutionStage | null;

    if (!personaKey) {
      return NextResponse.json({ error: "personaKey required" }, { status: 400 });
    }

    // Get evolved persona
    const evolved = await getEvolvedPersona(
      userId,
      personaKey,
      stage ? { careerLevel: stage === "legend" ? "legend" : stage === "mastery" ? "elite" : "rookie" } : undefined
    );

    if (!evolved) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    return NextResponse.json({ persona: evolved });
  } catch (err: any) {
    console.error("[PersonasEvolve] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to evolve persona" },
      { status: 500 }
    );
  }
}




