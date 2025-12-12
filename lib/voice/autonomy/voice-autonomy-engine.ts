// Voice Autonomy Engine v1
// lib/voice/autonomy/voice-autonomy-engine.ts

import { VoiceAutonomyTrigger, VoiceIntervention, VoicePersonaKey } from "./types";
import { PulseCortexContext } from "@/lib/cortex/types";
import { getTriggerConfig } from "./voice-triggers";
import { runAutonomy } from "@/lib/cortex/autonomy/v3";
import { generateMicroPlan } from "@/lib/cortex/executive";
import { logTrace } from "@/lib/cortex/trace/trace";
import { PulseObjective } from "@/lib/cortex/executive";
import { v4 as uuidv4 } from "uuid";

/**
 * Generate voice intervention for a trigger
 */
export async function generateVoiceIntervention(
  userId: string,
  trigger: VoiceAutonomyTrigger,
  ctx: PulseCortexContext,
  personaOverride?: VoicePersonaKey
): Promise<VoiceIntervention | null> {
  const triggerConfig = getTriggerConfig(trigger);
  if (!triggerConfig) {
    console.warn(`[Voice Autonomy] Unknown trigger: ${trigger}`);
    return null;
  }

  // Check if trigger is actually active
  if (!triggerConfig.evaluate(ctx)) {
    return null;
  }

  const persona = personaOverride || triggerConfig.defaultPersona;

  // Generate message based on trigger and context
  const message = await generateInterventionMessage(trigger, ctx, persona);

  // Get relevant autonomy actions
  const autonomyActions = runAutonomy(ctx);
  const relevantAction = autonomyActions
    .filter((a) => {
      if (trigger === "autonomy_action_urgent") {
        return a.severity === "urgent";
      }
      if (trigger === "relationship_opportunity") {
        return a.domain === "relationships";
      }
      if (trigger === "financial_risk_window") {
        return a.domain === "finance";
      }
      return a.severity === "urgent" || a.severity === "warning";
    })
    .slice(0, 1)[0];

  // Generate micro-plan if needed
  let microPlan;
  if (relevantAction && relevantAction.payload.type === "create_task") {
    const objective: PulseObjective = {
      id: `voice_obj_${Date.now()}`,
      domain: relevantAction.domain as any,
      title: relevantAction.title,
      description: relevantAction.description,
      importance: relevantAction.severity === "urgent" ? 90 : 70,
      urgency: relevantAction.severity === "urgent" ? 90 : 70,
      estimatedMinutes: relevantAction.payload.estimatedMinutes || 30,
    };

    microPlan = generateMicroPlan([objective], ctx);
  }

  const intervention: VoiceIntervention = {
    id: uuidv4(),
    trigger,
    personaKey: persona,
    message,
    urgency: triggerConfig.urgency,
    timestamp: new Date().toISOString(),
    microPlan,
    recommendedAction: relevantAction,
    traceEntry: {
      level: triggerConfig.urgency === "high" ? "warn" : "info",
      message: `Voice intervention: ${triggerConfig.name}`,
      data: {
        trigger: trigger,
        persona: persona,
        urgency: triggerConfig.urgency,
      },
    },
  };

  // Log to trace
  await logTrace(
    userId,
    "cortex",
    intervention.traceEntry.level,
    intervention.traceEntry.message,
    intervention.traceEntry.data,
    { domain: "voice_autonomy" }
  );

  return intervention;
}

/**
 * Generate intervention message based on trigger and context
 */
async function generateInterventionMessage(
  trigger: VoiceAutonomyTrigger,
  ctx: PulseCortexContext,
  persona: VoicePersonaKey
): Promise<string> {
  // Persona-specific message templates
  const personaTones: Record<VoicePersonaKey, { greeting: string; style: string }> = {
    calm: { greeting: "Hey there", style: "gentle, supportive" },
    hype: { greeting: "Let's go!", style: "energetic, motivational" },
    command: { greeting: "Listen up", style: "direct, authoritative" },
    warm_advisor: { greeting: "I've been thinking", style: "caring, thoughtful" },
    strategic: { greeting: "Here's the situation", style: "analytical, clear" },
    motivational: { greeting: "You've got this", style: "encouraging, uplifting" },
    confidant: { greeting: "I noticed", style: "empathetic, understanding" },
  };

  const tone = personaTones[persona] || personaTones.warm_advisor;

  // Generate trigger-specific message
  switch (trigger) {
    case "burnout_detected":
      return `${tone.greeting}. I'm seeing signs of burnout. Your stress levels are high and you've been pushing hard. Let's take a step back and prioritize rest.`;

    case "relationship_opportunity":
      const person = ctx.domains.relationships?.keyPeople?.find(
        (p) => p.relationshipScore > 70 && p.daysSinceInteraction > 30
      );
      return `${tone.greeting}. There's a great opportunity to reconnect with ${person?.name || "someone important"}. It's been ${person?.daysSinceInteraction || 30} days. Want me to help you reach out?`;

    case "upcoming_meeting":
      return `${tone.greeting}. You have an important meeting coming up. Let's make sure you're prepared.`;

    case "task_avoidance":
      return `${tone.greeting}. I'm noticing some tasks are getting delayed. This might be a procrastination pattern. Want to break them down into smaller steps?`;

    case "high_momentum":
      return `${tone.greeting}! You're in a high-productivity zone. This is a great time to tackle your most important projects. Let's capitalize on this momentum.`;

    case "life_chapter_transition":
      const currentChapter = ctx.longitudinal.chapters[ctx.longitudinal.chapters.length - 1];
      return `${tone.greeting}. You're transitioning into a new life chapter: "${currentChapter?.title || "New Phase"}". This is a good time to reflect and set new intentions.`;

    case "financial_risk_window":
      return `${tone.greeting}. I'm detecting some financial stress patterns. Let's review your cashflow and make sure you're on solid ground.`;

    case "habit_streak_break":
      const brokenHabit = ctx.domains.life?.habits?.find((h) => h.streak === 0);
      return `${tone.greeting}. Your "${brokenHabit?.name || "habit"}" streak broke. No worries - let's get back on track today.`;

    case "emotion_spike":
      const emotion = ctx.emotion?.detected_emotion;
      return `${tone.greeting}. I'm sensing you're feeling ${emotion || "intense emotions"} right now. Want to talk through it?`;

    case "autonomy_action_urgent":
      return `${tone.greeting}. There's something urgent that needs your attention. Let me show you what it is.`;

    default:
      return `${tone.greeting}. I have something to share with you.`;
  }
}

/**
 * Check if intervention should be fired (cooldown check)
 */
export function shouldFireIntervention(
  trigger: VoiceAutonomyTrigger,
  lastInterventionTime?: string,
  cooldownMinutes?: number
): boolean {
  if (!lastInterventionTime) return true;

  const triggerConfig = getTriggerConfig(trigger);
  const cooldown = cooldownMinutes || triggerConfig?.cooldownMinutes || 60;

  const lastTime = new Date(lastInterventionTime).getTime();
  const cooldownMs = cooldown * 60 * 1000;
  const now = Date.now();

  return now - lastTime > cooldownMs;
}



