// Persona Evolution Engine
// lib/personas/evolution.ts

import { supabaseAdmin } from "@/lib/supabase";
import { PersonaProfile, EvolutionStage, EvolutionContext } from "./types";
import { evaluateStage, applyStageModifiers } from "./stages";
import { getVoiceProfileByKey } from "@/lib/voices/seed";

/**
 * Get evolved persona for user
 */
export async function getEvolvedPersona(
  userId: string,
  basePersonaKey: string,
  context?: EvolutionContext
): Promise<PersonaProfile | null> {
  // Get base persona
  const basePersona = await getVoiceProfileByKey(basePersonaKey);
  if (!basePersona) return null;

  // If no context provided, fetch it
  if (!context) {
    context = await loadEvolutionContext(userId);
  }

  // Evaluate stage
  const stage = evaluateStage(context);

  // Get stage configs from database
  const { data: profileData } = await supabaseAdmin
    .from("voice_profiles")
    .select("stage_configs, metadata, is_generated, id")
    .eq("key", basePersonaKey)
    .maybeSingle();

  const stageConfigs = (profileData?.stage_configs as any) || {};
  const stageConfig = stageConfigs[stage];

  // Apply modifiers
  const evolvedStyle = applyStageModifiers(basePersona.style, stageConfig);

  return {
    id: profileData?.id || basePersona.key,
    key: basePersona.key,
    name: `${basePersona.name} (${stage.charAt(0).toUpperCase() + stage.slice(1)})`,
    description: basePersona.description,
    style: evolvedStyle,
    stage_configs: stageConfigs,
    metadata: (profileData?.metadata as any) || {},
    is_generated: profileData?.is_generated || false,
  };
}

/**
 * Load evolution context for user
 */
async function loadEvolutionContext(userId: string): Promise<EvolutionContext> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const context: EvolutionContext = {};

  // Get XP rank (if xp_transactions exists)
  try {
    const { data: xpTransactions } = await supabaseAdmin
      .from("xp_transactions")
      .select("amount")
      .eq("user_id", dbUserId);

    if (xpTransactions) {
      context.xpRank = xpTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    }
  } catch (err) {
    // Table might not exist
  }

  // Get career level
  try {
    const { data: progress } = await supabaseAdmin
      .from("user_career_progress")
      .select("career_levels(code)")
      .eq("user_id", dbUserId)
      .maybeSingle();

    if (progress && (progress.career_levels as any)?.code) {
      context.careerLevel = (progress.career_levels as any).code;
    }
  } catch (err) {
    // Table might not exist
  }

  // Get philosophy progress (if philosophy_dojo exists)
  try {
    const { data: dojo } = await supabaseAdmin
      .from("philosophy_dojo")
      .select("progress")
      .eq("user_id", dbUserId)
      .maybeSingle();

    if (dojo) {
      context.philosophyProgress = dojo.progress || 0;
    }
  } catch (err) {
    // Table might not exist
  }

  // Get emotional stability (from recent emotion states)
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: emotions } = await supabaseAdmin
      .from("emo_states")
      .select("detected_emotion")
      .eq("user_id", dbUserId)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .limit(100);

    if (emotions && emotions.length > 0) {
      // Calculate stability (ratio of calm/positive emotions)
      const positiveEmotions = ["calm", "happy", "confident", "motivated"];
      const positiveCount = emotions.filter((e) =>
        positiveEmotions.includes((e.detected_emotion || "").toLowerCase())
      ).length;
      context.emotionalStability = positiveCount / emotions.length;
    }
  } catch (err) {
    // Table might not exist
  }

  // Get journaling streak (if journals table exists)
  try {
    const { data: journals } = await supabaseAdmin
      .from("journals")
      .select("created_at")
      .eq("user_id", dbUserId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (journals && journals.length > 0) {
      // Calculate streak
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < journals.length; i++) {
        const journalDate = new Date(journals[i].created_at);
        journalDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today.getTime() - journalDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === i) {
          streak++;
        } else {
          break;
        }
      }
      context.journalingStreak = streak;
    }
  } catch (err) {
    // Table might not exist
  }

  return context;
}

