// Conscious Companion Engine - Experience v11
// lib/companion/engine.ts

import { supabaseAdmin } from "@/lib/supabase";
import { getTwinModel } from "@/lib/twin/engine";
import { getWorkCortexContextForUser } from "@/lib/cortex/context";
import { generateFutureSelfMessage } from "@/lib/twin/future-self";
import { callAIJson } from "@/lib/ai/call";

export interface CompanionIntervention {
  insight: string;
  suggestion: string;
  emotionalGrounding: string;
  timelineProtection: string;
}

/**
 * Companion observes situation
 */
export async function companionObserve(userId: string, situation: string): Promise<void> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  // Update companion state
  await supabaseAdmin
    .from("companion_state")
    .upsert(
      {
        user_id: dbUserId,
        last_seen_situation: situation,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );
}

/**
 * Companion intervenes
 */
export async function companionIntervene(
  userId: string,
  situation: string
): Promise<CompanionIntervention> {
  // Load TwinModel
  const twin = await getTwinModel(userId);
  if (!twin) {
    throw new Error("Twin model not found");
  }

  // Load Cortex context
  const ctx = await getWorkCortexContextForUser(userId);

  // Get Future Self message
  const futureSelf = await generateFutureSelfMessage({
    userId,
    situation,
  });

  // Generate intervention
  const systemPrompt = `You are Pulse Companion - a second consciousness co-pilot.

Generate an intervention that includes:
- Insight (what's really happening)
- Suggestion (what to do)
- Emotional grounding (how to feel about this)
- Timeline protection (advice from Future Self perspective)

Be supportive but direct. Reference user's patterns.`;

  const userPrompt = `Situation: ${situation}

User Twin:
- Strengths: ${JSON.stringify(twin.strengths)}
- Risk Patterns: ${JSON.stringify(twin.riskPatterns)}

Current State:
- Emotion: ${ctx.emotion?.detected_emotion || "neutral"}
- Energy: ${ctx.cognitiveProfile?.currentEnergyLevel || 0.5}

Future Self Message: ${futureSelf.message}

Generate intervention.`;

  const response = await callAIJson<CompanionIntervention>({
    userId,
    feature: "companion_intervention",
    systemPrompt,
    userPrompt,
    maxTokens: 800,
    temperature: 0.8,
  });

  if (!response.success || !response.data) {
    // Fallback
    return {
      insight: "You're in a challenging moment.",
      suggestion: "Take a step back and assess.",
      emotionalGrounding: "This is temporary. You've handled similar situations before.",
      timelineProtection: "Future you will thank you for making the right choice now.",
    };
  }

  const intervention = response.data;

  // Store intervention
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  const { data: interventionRecord } = await supabaseAdmin
    .from("companion_interventions")
    .insert({
      user_id: dbUserId,
      situation,
      insight: intervention.insight,
      suggestion: intervention.suggestion,
      emotional_grounding: intervention.emotionalGrounding,
      timeline_protection: intervention.timelineProtection,
    })
    .select()
    .single();

  // Update companion state
  await supabaseAdmin
    .from("companion_state")
    .upsert(
      {
        user_id: dbUserId,
        last_seen_situation: situation,
        last_intervention_id: interventionRecord?.id,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );

  return intervention;
}



