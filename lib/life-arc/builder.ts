// Life Arc Builder - Aggregation Logic
// lib/life-arc/builder.ts

import { supabaseAdmin } from "@/lib/supabase";
import { LifeArc, LifeArcKey, UserModelSnapshot } from "./model";

export interface ArcDefinition {
  key: LifeArcKey;
  name: string;
  description: string;
  priority: number;
  targetDays?: number;
}

/**
 * Build or update life arcs based on user model
 */
export async function buildOrUpdateLifeArcs(
  userId: string,
  userModel: UserModelSnapshot
): Promise<LifeArc[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Infer arcs from user model
  const inferredArcs: ArcDefinition[] = [];

  // 1. Healing / Emotional Stability
  if (
    userModel.emotionState === "overwhelmed" ||
    userModel.emotionState === "anxious" ||
    userModel.emotionState === "depressed" ||
    (userModel.stressScore && userModel.stressScore > 0.7)
  ) {
    const confidantPhase = userModel.personaSoulLines?.find((p) => p.coachId === "confidant")?.phase;
    if (confidantPhase === "stabilization" || confidantPhase === "healing" || !confidantPhase) {
      inferredArcs.push({
        key: "healing",
        name: "Healing & Stability",
        description: "Focus on emotional regulation, stress management, and building resilience",
        priority: 1,
        targetDays: 90,
      });
    } else {
      inferredArcs.push({
        key: "emotional_stability",
        name: "Emotional Stability",
        description: "Maintain emotional balance and prevent burnout",
        priority: 2,
        targetDays: 60,
      });
    }
  }

  // 2. Career Level-Up
  if (
    userModel.careerLevel &&
    (userModel.careerLevel === "rookie" || userModel.careerLevel === "operator") &&
    userModel.careerProgress !== undefined &&
    userModel.careerProgress < 0.8
  ) {
    inferredArcs.push({
      key: "career_level_up",
      name: "Career Level-Up",
      description: "Advance to the next career level through consistent performance and skill development",
      priority: inferredArcs.length === 0 ? 1 : 2,
      targetDays: 90,
    });
  }

  // 3. Career Transition
  if (
    userModel.careerLevel &&
    (userModel.careerLevel === "pro" || userModel.careerLevel === "elite") &&
    userModel.careerProgress !== undefined &&
    userModel.careerProgress > 0.9
  ) {
    inferredArcs.push({
      key: "career_transition",
      name: "Career Transition",
      description: "Prepare for next career phase or role transition",
      priority: 2,
      targetDays: 180,
    });
  }

  // 4. Financial Reset
  if (userModel.financeStress) {
    inferredArcs.push({
      key: "financial_reset",
      name: "Financial Reset",
      description: "Rebuild financial stability and reduce money stress",
      priority: inferredArcs.length === 0 ? 1 : 2,
      targetDays: 120,
    });
  }

  // 5. Relationship Restore
  if (userModel.relationshipFlags && userModel.relationshipFlags.includes("conflict")) {
    inferredArcs.push({
      key: "relationship_restore",
      name: "Relationship Restore",
      description: "Repair trust and improve key relationships",
      priority: 2,
      targetDays: 90,
    });
  }

  // 6. Performance Push
  const salesPhase = userModel.personaSoulLines?.find((p) => p.coachId === "sales")?.phase;
  if (salesPhase === "growth" || salesPhase === "mastery") {
    inferredArcs.push({
      key: "performance_push",
      name: "Performance Push",
      description: "Accelerate sales performance and systematize pipeline",
      priority: 2,
      targetDays: 60,
    });
  }

  // 7. Identity Rebuild
  const identityPhase = userModel.personaSoulLines?.find((p) => p.coachId === "identity")?.phase;
  if (identityPhase === "rebuild" || identityPhase === "discovery") {
    inferredArcs.push({
      key: "identity_rebuild",
      name: "Identity Rebuild",
      description: "Clarify core values and rebuild authentic identity",
      priority: 2,
      targetDays: 120,
    });
  }

  // Limit to max 3 active arcs
  const prioritizedArcs = inferredArcs
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);

  // Create or update arcs
  const createdArcs: LifeArc[] = [];

  for (const arcDef of prioritizedArcs) {
    // Check if arc already exists
    const { data: existing } = await supabaseAdmin
      .from("life_arcs")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("key", arcDef.key)
      .eq("status", "active")
      .maybeSingle();

    let arcId: string;
    let targetDate: string | undefined;

    if (arcDef.targetDays) {
      const target = new Date();
      target.setDate(target.getDate() + arcDef.targetDays);
      targetDate = target.toISOString().split("T")[0];
    }

    if (existing) {
      // Update existing arc
      const { data: updated } = await supabaseAdmin
        .from("life_arcs")
        .update({
          name: arcDef.name,
          description: arcDef.description,
          priority: arcDef.priority,
          target_date: targetDate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("*")
        .single();

      if (updated) {
        arcId = updated.id;
        createdArcs.push({
          id: updated.id,
          userId: dbUserId,
          key: updated.key as LifeArcKey,
          name: updated.name,
          description: updated.description || undefined,
          status: updated.status as any,
          priority: updated.priority,
          startDate: updated.start_date,
          targetDate: updated.target_date || undefined,
        });
      }
    } else {
      // Create new arc
      const { data: newArc } = await supabaseAdmin
        .from("life_arcs")
        .insert({
          user_id: dbUserId,
          key: arcDef.key,
          name: arcDef.name,
          description: arcDef.description,
          priority: arcDef.priority,
          target_date: targetDate,
        })
        .select("*")
        .single();

      if (newArc) {
        arcId = newArc.id;
        createdArcs.push({
          id: newArc.id,
          userId: dbUserId,
          key: newArc.key as LifeArcKey,
          name: newArc.name,
          description: newArc.description || undefined,
          status: newArc.status as any,
          priority: newArc.priority,
          startDate: newArc.start_date,
          targetDate: newArc.target_date || undefined,
        });

        // Link sources
        await linkArcSources(arcId, arcDef.key, userModel);
      }
    }
  }

  // Pause arcs that are no longer relevant
  const { data: allActiveArcs } = await supabaseAdmin
    .from("life_arcs")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("status", "active");

  if (allActiveArcs) {
    for (const arc of allActiveArcs) {
      if (!prioritizedArcs.find((a) => a.key === arc.key)) {
        // Arc is no longer relevant, pause it
        await supabaseAdmin
          .from("life_arcs")
          .update({ status: "paused", updated_at: new Date().toISOString() })
          .eq("id", arc.id);
      }
    }
  }

  return createdArcs;
}

/**
 * Link arc to underlying sources
 */
async function linkArcSources(
  arcId: string,
  arcKey: LifeArcKey,
  userModel: UserModelSnapshot
): Promise<void> {
  const sources: Array<{ sourceType: string; sourceId?: string; weight: number }> = [];

  if (arcKey === "healing" || arcKey === "emotional_stability") {
    const confidant = userModel.personaSoulLines?.find((p) => p.coachId === "confidant");
    if (confidant) {
      sources.push({ sourceType: "persona_soul_line", weight: 1.5 });
    }
    sources.push({ sourceType: "emotion_os", weight: 1.0 });
  }

  if (arcKey === "career_level_up" || arcKey === "career_transition") {
    sources.push({ sourceType: "career", weight: 1.5 });
    const career = userModel.personaSoulLines?.find((p) => p.coachId === "career");
    if (career) {
      sources.push({ sourceType: "persona_soul_line", weight: 1.0 });
    }
  }

  if (arcKey === "financial_reset") {
    sources.push({ sourceType: "finance", weight: 1.5 });
  }

  if (arcKey === "performance_push") {
    const sales = userModel.personaSoulLines?.find((p) => p.coachId === "sales");
    if (sales) {
      sources.push({ sourceType: "persona_soul_line", weight: 1.5 });
    }
  }

  if (sources.length > 0) {
    await supabaseAdmin.from("life_arc_sources").insert(
      sources.map((s) => ({
        arc_id: arcId,
        source_type: s.sourceType,
        source_id: s.sourceId || null,
        weight: s.weight,
        metadata: {},
      }))
    );
  }
}




