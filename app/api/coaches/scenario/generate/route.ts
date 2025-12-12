// Scenario Generation API
// app/api/coaches/scenario/generate/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildCoachContextPack } from "@/lib/coaches/context";
import { generateScenarioFromPrompt } from "@/lib/coaches/scenarioGenerator";
import { supabaseAdmin } from "@/lib/supabase";
import { CoachDifficulty } from "@/lib/coaches/types";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { prompt, coachType = "sales", preferredDifficulty } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt required" }, { status: 400 });
    }

    // Build context
    const contextPack = await buildCoachContextPack({
      userId,
      coachId: coachType,
    });

    // Generate scenario
    const generatedScenario = await generateScenarioFromPrompt({
      prompt,
      userProfile: contextPack.userProfile,
      thirdBrainInsights: contextPack.thirdBrainInsights,
      preferredDifficulty: preferredDifficulty as CoachDifficulty | undefined,
    });

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Save generated scenario
    const { data: savedScenario } = await supabaseAdmin
      .from("coach_generated_scenarios")
      .insert({
        user_id: dbUserId,
        input_prompt: prompt,
        generated_scenario: generatedScenario,
        difficulty_rating: generatedScenario.difficulty,
        quality_score: generatedScenario.qualityScore,
      })
      .select("id")
      .single();

    // Also save to coach_scenarios for reuse
    const { data: reusableScenario } = await supabaseAdmin
      .from("coach_scenarios")
      .insert({
        coach_type: generatedScenario.coachType,
        title: generatedScenario.title,
        description: generatedScenario.description,
        difficulty: generatedScenario.difficulty,
        topic_tags: generatedScenario.topicTags,
        customer_profile: generatedScenario.customerProfile,
        constraints: generatedScenario.constraints,
        initial_prompt: generatedScenario.initialPrompt,
      })
      .select("id")
      .single();

    return NextResponse.json({
      scenario: {
        ...generatedScenario,
        id: reusableScenario?.id || savedScenario?.id,
      },
      generatedScenarioId: savedScenario?.id,
      reusableScenarioId: reusableScenario?.id,
    });
  } catch (err: any) {
    console.error("[ScenarioGenerate] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate scenario" },
      { status: 500 }
    );
  }
}

