// Pulse Meta-OS Engine - Experience v12
// lib/metaos/engine.ts

import { supabaseAdmin } from "@/lib/supabase";
import { buildPulseCortexContext } from "@/lib/cortex/context";
import { callAIJson } from "@/lib/ai/call";

export interface MetaOSProfile {
  preferredOSStyles: string[];
  preferredCoachModes: string[];
  preferredExperienceModes: string[];
  autoAdjustmentsEnabled: boolean;
}

export interface OSRebuild {
  rebuildType: "full" | "partial" | "theme" | "workflow";
  changes: Record<string, any>;
}

/**
 * Rebuild user OS
 */
export async function rebuildUserOS(userId: string): Promise<OSRebuild> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  // 1. Analyze usage patterns
  const ctx = await buildPulseCortexContext(userId);

  // Get existing meta profile
  const { data: existingProfile } = await supabaseAdmin
    .from("meta_profiles")
    .select("*")
    .eq("user_id", dbUserId)
    .maybeSingle();

  // Analyze patterns
  const systemPrompt = `You are analyzing a user's OS usage patterns to rebuild their personalized OS.

Analyze:
- Which dashboards they engage with most
- Which coach modes they use most
- Emotional responses to UI
- Physiological responses to workflows
- Preferred interaction styles

Generate:
- Preferred OS styles (structured, flow-based, minimalist, etc.)
- Preferred coach modes
- Preferred experience modes (voice-first, AR-first, dashboard-first)
- Specific changes to make (theme, navigation, workflow, etc.)`;

  const userPrompt = `Current State:
- Emotion: ${ctx.emotion?.detected_emotion || "neutral"}
- Energy: ${ctx.cognitiveProfile?.currentEnergyLevel || 0.5}
- Identity: ${ctx.longitudinal.chapters[ctx.longitudinal.chapters.length - 1]?.title || "Current"}

Existing Profile:
${JSON.stringify(existingProfile || {})}

Generate OS rebuild recommendations.`;

  const response = await callAIJson<{
    preferredOSStyles: string[];
    preferredCoachModes: string[];
    preferredExperienceModes: string[];
    changes: Record<string, any>;
    rebuildType: "full" | "partial" | "theme" | "workflow";
  }>({
    userId,
    feature: "metaos_rebuild",
    systemPrompt,
    userPrompt,
    maxTokens: 1500,
    temperature: 0.7,
  });

  if (!response.success || !response.data) {
    // Fallback
    return {
      rebuildType: "partial",
      changes: {},
    };
  }

  const data = response.data;

  // Update meta profile
  await supabaseAdmin
    .from("meta_profiles")
    .upsert(
      {
        user_id: dbUserId,
        preferred_os_styles: data.preferredOSStyles,
        preferred_coach_modes: data.preferredCoachModes,
        preferred_experience_modes: data.preferredExperienceModes,
        last_rebuild_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );

  // Store rebuild record
  await supabaseAdmin.from("meta_rebuilds").insert({
    user_id: dbUserId,
    rebuild_type: data.rebuildType,
    changes: data.changes,
  });

  return {
    rebuildType: data.rebuildType,
    changes: data.changes,
  };
}

/**
 * Get meta profile
 */
export async function getMetaProfile(userId: string): Promise<MetaOSProfile | null> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  const { data: profile } = await supabaseAdmin
    .from("meta_profiles")
    .select("*")
    .eq("user_id", dbUserId)
    .maybeSingle();

  if (!profile) {
    return null;
  }

  return {
    preferredOSStyles: profile.preferred_os_styles || [],
    preferredCoachModes: profile.preferred_coach_modes || [],
    preferredExperienceModes: profile.preferred_experience_modes || [],
    autoAdjustmentsEnabled: profile.auto_adjustments_enabled ?? true,
  };
}



