// Motion Preview API
// app/api/personas/motion-preview/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { splitTextIntoPhases, applyMotionToSegments, PREDEFINED_MOTION_PROFILES } from "@/lib/personas/motion";
import { getVoiceProfileByKey } from "@/lib/voices/seed";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { personaId, motionProfileKey, text } = body;

    if (!personaId || !motionProfileKey || !text) {
      return NextResponse.json(
        { error: "personaId, motionProfileKey, and text required" },
        { status: 400 }
      );
    }

    // Get persona
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

    // Get motion profile
    const motionProfile = PREDEFINED_MOTION_PROFILES.find(
      (p) => p.key === motionProfileKey
    );

    if (!motionProfile) {
      return NextResponse.json({ error: "Motion profile not found" }, { status: 404 });
    }

    // Split into phases
    const segments = splitTextIntoPhases(text, motionProfile.phases);

    // Apply motion
    const transformedSegments = applyMotionToSegments(
      segments,
      persona as any,
      motionProfile
    );

    return NextResponse.json({
      segments: transformedSegments,
      phases: motionProfile.phases.map((p, idx) => ({
        id: p.id,
        segment: transformedSegments[idx] || "",
        tuning_delta: p.tuning_delta,
      })),
    });
  } catch (err: any) {
    console.error("[MotionPreview] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to preview motion" },
      { status: 500 }
    );
  }
}




