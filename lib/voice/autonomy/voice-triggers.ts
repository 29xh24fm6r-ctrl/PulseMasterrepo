// Voice Autonomy Triggers
// lib/voice/autonomy/voice-triggers.ts

import { VoiceAutonomyTriggerConfig } from "./types";
import { PulseCortexContext } from "@/lib/cortex/types";

/**
 * Voice Autonomy Trigger Configurations
 */
export const VOICE_AUTONOMY_TRIGGERS: VoiceAutonomyTriggerConfig[] = [
  {
    id: "burnout_detected",
    name: "Burnout Detected",
    description: "User is showing signs of burnout",
    defaultPersona: "warm_advisor",
    messageClass: "warning",
    urgency: "high",
    cooldownMinutes: 60,
    evaluate: (ctx: PulseCortexContext) => {
      const burnoutPatterns = ctx.longitudinal.aggregatedPatterns.filter(
        (p) => p.type === "burnout_cycle"
      );
      if (burnoutPatterns.length === 0) return false;

      const recentPattern = burnoutPatterns[0];
      const isRecent = !recentPattern.endDate ||
        new Date(recentPattern.endDate).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;

      const isStressed = ctx.emotion &&
        (ctx.emotion.detected_emotion === "stressed" ||
          ctx.emotion.detected_emotion === "overwhelmed" ||
          ctx.emotion.detected_emotion === "burned_out") &&
        ctx.emotion.intensity > 0.7;

      return isRecent && isStressed;
    },
  },
  {
    id: "relationship_opportunity",
    name: "Relationship Opportunity",
    description: "High-value relationship needs attention",
    defaultPersona: "warm_advisor",
    messageClass: "suggestion",
    urgency: "medium",
    cooldownMinutes: 30,
    evaluate: (ctx: PulseCortexContext) => {
      if (!ctx.domains.relationships?.keyPeople) return false;

      const opportunities = ctx.domains.relationships.keyPeople.filter(
        (p) => p.relationshipScore > 70 && p.daysSinceInteraction > 30 && p.daysSinceInteraction < 60
      );

      return opportunities.length > 0;
    },
  },
  {
    id: "upcoming_meeting",
    name: "Upcoming Meeting",
    description: "Important meeting starting soon",
    defaultPersona: "strategic",
    messageClass: "alert",
    urgency: "high",
    cooldownMinutes: 15,
    evaluate: (ctx: PulseCortexContext) => {
      // TODO: Integrate with calendar system
      // For now, check if there are high-priority tasks that might be meetings
      const highPriorityTasks = ctx.domains.work?.queue?.filter(
        (item) => item.priority === "high" || item.priority === "urgent"
      ) || [];

      return highPriorityTasks.length > 0;
    },
  },
  {
    id: "task_avoidance",
    name: "Task Avoidance",
    description: "User is avoiding important tasks",
    defaultPersona: "command",
    messageClass: "guidance",
    urgency: "medium",
    cooldownMinutes: 45,
    evaluate: (ctx: PulseCortexContext) => {
      const procrastinationPatterns = ctx.longitudinal.aggregatedPatterns.filter(
        (p) => p.type === "procrastination_cycle"
      );

      if (procrastinationPatterns.length === 0) return false;

      // Check if there are overdue or delayed tasks
      const overdueTasks = ctx.domains.work?.queue?.filter(
        (item) => item.status === "overdue" || item.status === "delayed"
      ) || [];

      return overdueTasks.length >= 3;
    },
  },
  {
    id: "high_momentum",
    name: "High Momentum",
    description: "User is in a high-productivity period",
    defaultPersona: "hype",
    messageClass: "celebration",
    urgency: "low",
    cooldownMinutes: 120,
    evaluate: (ctx: PulseCortexContext) => {
      const productivityArcs = ctx.longitudinal.aggregatedPatterns.filter(
        (p) => p.type === "productivity_arc"
      );

      if (productivityArcs.length === 0) return false;

      const recentArc = productivityArcs[0];
      const isActive = !recentArc.endDate || new Date(recentArc.endDate) > new Date();
      const isStrong = recentArc.strength > 0.7;

      return isActive && isStrong;
    },
  },
  {
    id: "life_chapter_transition",
    name: "Life Chapter Transition",
    description: "User is transitioning between life chapters",
    defaultPersona: "strategic",
    messageClass: "guidance",
    urgency: "medium",
    cooldownMinutes: 180,
    evaluate: (ctx: PulseCortexContext) => {
      const chapters = ctx.longitudinal.chapters;
      if (chapters.length === 0) return false;

      const currentChapter = chapters[chapters.length - 1];
      const isRecent = !currentChapter.end ||
        new Date(currentChapter.end).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000;

      return isRecent;
    },
  },
  {
    id: "financial_risk_window",
    name: "Financial Risk Window",
    description: "Financial stress patterns detected",
    defaultPersona: "strategic",
    messageClass: "warning",
    urgency: "high",
    cooldownMinutes: 60,
    evaluate: (ctx: PulseCortexContext) => {
      const stressPatterns = ctx.longitudinal.aggregatedPatterns.filter(
        (p) => p.type === "financial_stress_window"
      );

      if (stressPatterns.length === 0) return false;

      const recentPattern = stressPatterns[0];
      const isActive = !recentPattern.endDate ||
        new Date(recentPattern.endDate).getTime() > Date.now();

      return isActive && recentPattern.strength > 0.6;
    },
  },
  {
    id: "habit_streak_break",
    name: "Habit Streak Break",
    description: "Important habit streak has been broken",
    defaultPersona: "motivational",
    messageClass: "guidance",
    urgency: "low",
    cooldownMinutes: 60,
    evaluate: (ctx: PulseCortexContext) => {
      if (!ctx.domains.life?.habits) return false;

      const brokenStreaks = ctx.domains.life.habits.filter(
        (h) => h.streak === 0 && h.completionRate < 0.5
      );

      return brokenStreaks.length > 0;
    },
  },
  {
    id: "emotion_spike",
    name: "Emotion Spike",
    description: "Significant emotional change detected",
    defaultPersona: "confidant",
    messageClass: "alert",
    urgency: "high",
    cooldownMinutes: 30,
    evaluate: (ctx: PulseCortexContext) => {
      if (!ctx.emotion) return false;

      const isIntense = ctx.emotion.intensity > 0.8;
      const isNegative = ["stressed", "anxious", "sad", "angry", "fearful"].includes(
        ctx.emotion.detected_emotion
      );

      return isIntense && isNegative;
    },
  },
  {
    id: "autonomy_action_urgent",
    name: "Urgent Autonomy Action",
    description: "Urgent action requires attention",
    defaultPersona: "command",
    messageClass: "alert",
    urgency: "high",
    cooldownMinutes: 20,
    evaluate: (ctx: PulseCortexContext) => {
      // This will be checked by polling autonomy actions
      // For now, return false - will be set by autonomy engine
      return false;
    },
  },
];

/**
 * Get trigger config by ID
 */
export function getTriggerConfig(id: VoiceAutonomyTrigger): VoiceAutonomyTriggerConfig | null {
  return VOICE_AUTONOMY_TRIGGERS.find((t) => t.id === id) || null;
}

/**
 * Evaluate all triggers and return active ones
 */
export function evaluateTriggers(ctx: PulseCortexContext): VoiceAutonomyTrigger[] {
  return VOICE_AUTONOMY_TRIGGERS
    .filter((trigger) => trigger.evaluate(ctx))
    .map((trigger) => trigger.id);
}



