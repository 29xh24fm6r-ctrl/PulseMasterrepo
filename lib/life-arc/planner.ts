// Life Arc Planner - Main Entry Point
// lib/life-arc/planner.ts

import { supabaseAdmin } from "@/lib/supabase";
import { buildOrUpdateLifeArcs } from "./builder";
import { getArcQuests } from "./quests";
import { LifeArc, LifeArcQuest, LifeArcPlan, UserModelSnapshot } from "./model";
import { getCurrentEmotionState } from "@/lib/emotion-os/server";
import { getCareerContextForMemory } from "@/lib/career/integrations";

/**
 * Get user model snapshot
 */
async function getUserModelSnapshot(userId: string): Promise<UserModelSnapshot> {
  const snapshot: UserModelSnapshot = {};

  // Get emotion state
  try {
    const emotion = await getCurrentEmotionState(userId);
    if (emotion) {
      snapshot.emotionState = emotion.detected_emotion?.toLowerCase() || undefined;
      snapshot.stressScore = emotion.intensity || 0;
    }
  } catch (err) {
    // Optional
  }

  // Get career context
  try {
    const career = await getCareerContextForMemory(userId);
    if (career) {
      snapshot.careerLevel = career.level;
      snapshot.careerProgress = career.progressToNext;
    }
  } catch (err) {
    // Optional
  }

  // Get persona soul lines (placeholder - would need actual implementation)
  // snapshot.personaSoulLines = await getPersonaSoulLines(userId);

  return snapshot;
}

/**
 * Get life arc plan for user
 */
export async function getLifeArcPlan(userId: string): Promise<LifeArcPlan> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Get user model snapshot
  const userModel = await getUserModelSnapshot(userId);

  // Build or update arcs
  await buildOrUpdateLifeArcs(userId, userModel);

  // Get active arcs
  const { data: arcsData } = await supabaseAdmin
    .from("life_arcs")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("status", "active")
    .order("priority", { ascending: true });

  if (!arcsData || arcsData.length === 0) {
    return {
      arcs: [],
      questsByArc: {},
    };
  }

  const arcs: LifeArc[] = arcsData.map((a) => ({
    id: a.id,
    userId: a.user_id,
    key: a.key as any,
    name: a.name,
    description: a.description || undefined,
    status: a.status as any,
    priority: a.priority,
    startDate: a.start_date,
    targetDate: a.target_date || undefined,
  }));

  // Get quests for each arc
  const questsByArc: Record<string, LifeArcQuest[]> = {};

  for (const arc of arcs) {
    const quests = await getArcQuests(arc.id);
    if (quests.length === 0) {
      // Generate quests if none exist
      const { generateArcQuests } = await import("./quests");
      const generated = await generateArcQuests(arc, userModel);
      questsByArc[arc.id] = generated;
    } else {
      questsByArc[arc.id] = quests;
    }
  }

  // Focus arc is the highest priority
  const focusArc = arcs.length > 0 ? arcs[0] : undefined;

  return {
    arcs,
    questsByArc,
    focusArc,
  };
}




