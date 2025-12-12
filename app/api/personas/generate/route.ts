// Persona Generation API
// app/api/personas/generate/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generatePersona, saveGeneratedPersona } from "@/lib/personas/generator";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { description } = body;

    if (!description) {
      return NextResponse.json({ error: "description required" }, { status: 400 });
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Create generation request
    const { data: request, error: requestError } = await supabaseAdmin
      .from("persona_generation_requests")
      .insert({
        user_id: dbUserId,
        input_description: description,
        status: "pending",
      })
      .select("id")
      .single();

    if (requestError || !request) {
      return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
    }

    // Generate persona
    const generated = await generatePersona({
      userId,
      description,
    });

    // Save to database
    const profileId = await saveGeneratedPersona(userId, request.id, generated);

    return NextResponse.json({
      persona: {
        id: profileId,
        ...generated,
      },
    });
  } catch (err: any) {
    console.error("[PersonasGenerate] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate persona" },
      { status: 500 }
    );
  }
}




