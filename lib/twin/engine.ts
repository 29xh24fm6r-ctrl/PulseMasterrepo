// AI Twin Engine - Experience v6
// lib/twin/engine.ts

import { supabaseAdmin } from "@/lib/supabase";
import { callAIJson } from "@/lib/ai/call";
import { buildPulseCortexContext } from "@/lib/cortex/context";

export interface TwinModel {
  summary: any;
  strengths: any[];
  weaknesses: any[];
  decisionPatterns: any[];
  riskPatterns: any[];
  values: any[];
}

/**
 * Build or update twin model
 */
export async function buildOrUpdateTwinModel(userId: string): Promise<TwinModel> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  // 1. Pull from Cortex context
  const ctx = await buildPulseCortexContext(userId);

  // 2. Pull from Third Brain / Universal Memory
  // (Would fetch notes, journal entries, tasks, completions, habits, etc.)
  // For now, using Cortex context as proxy

  // 3. Pull from Emotion OS
  const emotionPatterns = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "emotion_cycle"
  );

  // 4. Pull from Career Engine (if available)
  const careerData = ctx.domains.work || {};

  // 5. Call LLM to compress into TwinModel
  const systemPrompt = `You are building a compressed "AI Twin" model of a user. Analyze their patterns and create a concise self-model.

Extract:
- Core strengths (3-5)
- Key weaknesses/vulnerabilities (3-5)
- Decision patterns (how they typically make choices)
- Risk patterns (when they tend to fail, procrastinate, or burn out)
- Core values (what drives them)

Be specific and actionable.`;

  const userPrompt = `User context:
- Emotion patterns: ${JSON.stringify(emotionPatterns)}
- Work patterns: ${JSON.stringify(careerData)}
- Longitudinal patterns: ${JSON.stringify(ctx.longitudinal.aggregatedPatterns.slice(0, 5))}
- Identity: ${ctx.longitudinal.chapters[ctx.longitudinal.chapters.length - 1]?.title || "Current chapter"}

Build the AI Twin model.`;

  const response = await callAIJson<{
    summary: any;
    strengths: any[];
    weaknesses: any[];
    decisionPatterns: any[];
    riskPatterns: any[];
    values: any[];
  }>({
    userId,
    feature: "ai_twin_builder",
    systemPrompt,
    userPrompt,
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!response.success || !response.data) {
    // Fallback to basic model
    return {
      summary: { description: "User profile" },
      strengths: [],
      weaknesses: [],
      decisionPatterns: [],
      riskPatterns: [],
      values: [],
    };
  }

  const twinModel: TwinModel = response.data;

  // 6. Upsert into ai_twin_profiles
  await supabaseAdmin
    .from("ai_twin_profiles")
    .upsert(
      {
        user_id: dbUserId,
        summary: twinModel.summary,
        strengths: twinModel.strengths,
        weaknesses: twinModel.weaknesses,
        decision_patterns: twinModel.decisionPatterns,
        risk_patterns: twinModel.riskPatterns,
        values: twinModel.values,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );

  // 7. Create snapshot
  await supabaseAdmin.from("ai_twin_snapshots").insert({
    user_id: dbUserId,
    model_version: "v1",
    summary: twinModel.summary,
  });

  return twinModel;
}

/**
 * Get twin model
 */
export async function getTwinModel(userId: string): Promise<TwinModel | null> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  const { data: profile } = await supabaseAdmin
    .from("ai_twin_profiles")
    .select("*")
    .eq("user_id", dbUserId)
    .maybeSingle();

  if (!profile) {
    return null;
  }

  return {
    summary: profile.summary,
    strengths: profile.strengths,
    weaknesses: profile.weaknesses,
    decisionPatterns: profile.decision_patterns,
    riskPatterns: profile.risk_patterns,
    values: profile.values,
  };
}



