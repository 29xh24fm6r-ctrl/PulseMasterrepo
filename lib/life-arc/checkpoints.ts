// Life Arc Checkpoints
// lib/life-arc/checkpoints.ts

import { supabaseAdmin } from "@/lib/supabase";
import { LifeArc, LifeArcCheckpoint } from "./model";

/**
 * Run checkpoint for an arc
 */
export async function runArcCheckpoint(arc: LifeArc): Promise<LifeArcCheckpoint> {
  // Get arc sources
  const { data: sources } = await supabaseAdmin
    .from("life_arc_sources")
    .select("*")
    .eq("arc_id", arc.id);

  // Calculate progress from sources
  let progressScore = 0;
  const riskFlags: string[] = [];

  // Check career progress
  const careerSource = sources?.find((s) => s.source_type === "career");
  if (careerSource) {
    // Would fetch from career engine
    // For now, estimate based on time elapsed
    if (arc.targetDate) {
      const start = new Date(arc.startDate);
      const target = new Date(arc.targetDate);
      const now = new Date();
      const totalDays = (target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      const elapsedDays = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      progressScore = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
    }
  }

  // Check emotion state (for healing arcs)
  if (arc.key === "healing" || arc.key === "emotional_stability") {
    const emotionSource = sources?.find((s) => s.source_type === "emotion_os");
    if (emotionSource) {
      // Would check recent emotion states
      // For now, estimate based on time
      progressScore = Math.min(100, progressScore + 10);
    }
  }

  // Detect risks
  if (progressScore < 20 && arc.targetDate) {
    const daysRemaining = (new Date(arc.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
    if (daysRemaining < 30) {
      riskFlags.push("behind_schedule");
    }
  }

  // Generate summary
  const summary = `Progress: ${progressScore}%. ${riskFlags.length > 0 ? `Risks: ${riskFlags.join(", ")}` : "On track"}`;

  // Save checkpoint
  const { data: checkpoint } = await supabaseAdmin
    .from("life_arc_checkpoints")
    .insert({
      arc_id: arc.id,
      date: new Date().toISOString().split("T")[0],
      summary,
      progress_score: progressScore,
      risk_flags: riskFlags,
      metadata: {},
    })
    .select("*")
    .single();

  if (!checkpoint) {
    throw new Error("Failed to create checkpoint");
  }

  return {
    id: checkpoint.id,
    arcId: checkpoint.arc_id,
    date: checkpoint.date,
    summary: checkpoint.summary || undefined,
    progressScore: checkpoint.progress_score || undefined,
    riskFlags: checkpoint.risk_flags || [],
    metadata: checkpoint.metadata || {},
  };
}

/**
 * Run checkpoints for all active arcs
 */
export async function runLifeArcCheckpointCron(): Promise<void> {
  const { data: activeArcs } = await supabaseAdmin
    .from("life_arcs")
    .select("*")
    .eq("status", "active");

  if (!activeArcs) return;

  for (const arc of activeArcs) {
    try {
      await runArcCheckpoint({
        id: arc.id,
        userId: arc.user_id,
        key: arc.key as any,
        name: arc.name,
        description: arc.description || undefined,
        status: arc.status as any,
        priority: arc.priority,
        startDate: arc.start_date,
        targetDate: arc.target_date || undefined,
      });
    } catch (err) {
      console.error(`[LifeArcCheckpoints] Failed checkpoint for arc ${arc.id}:`, err);
    }
  }
}




