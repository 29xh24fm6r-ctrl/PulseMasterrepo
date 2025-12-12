// Moment-Driven Onboarding - Experience Ω
// lib/zero-friction/moment-driven-onboarding.ts

import { supabaseAdmin } from "@/lib/supabase";
import { callAI } from "@/lib/ai/call";

export interface MDOTrigger {
  triggerCode: string;
  description: string;
  microExplainer: string;
  targetExperience?: string;
}

export interface MDODelivery {
  triggerCode: string;
  message: string;
  action?: string;
  targetExperience?: string;
}

/**
 * Check for MDO triggers and deliver micro-onboarding
 */
export async function checkAndDeliverMDO(
  userId: string,
  context: {
    eventType: string;
    currentState?: Record<string, any>;
  }
): Promise<MDODelivery | null> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  // Get all triggers
  const { data: triggers } = await supabaseAdmin.from("mdo_triggers").select("*");

  // Get user's delivery history
  const { data: deliveries } = await supabaseAdmin
    .from("mdo_deliveries")
    .select("trigger_code")
    .eq("user_id", dbUserId);

  const deliveredCodes = new Set(deliveries?.map((d) => d.trigger_code) || []);

  // Find matching trigger
  let matchingTrigger: MDOTrigger | null = null;

  // Map event types to trigger codes
  const eventToTrigger: Record<string, string> = {
    second_task_added: "second_task_added",
    first_emotion_log: "first_emotion_log",
    task_stall: "task_stall",
    first_relationship: "first_relationship",
    high_stress: "high_stress",
    first_voice: "first_voice",
  };

  const triggerCode = eventToTrigger[context.eventType];
  if (triggerCode && !deliveredCodes.has(triggerCode)) {
    matchingTrigger = triggers?.find((t) => t.trigger_code === triggerCode) || null;
  }

  if (!matchingTrigger) {
    return null;
  }

  // Generate personalized message
  const message = await callAI({
    userId,
    feature: "mdo_message",
    systemPrompt: `You are delivering a 5-second micro-explainer. Be brief, friendly, and helpful.`,
    userPrompt: `Trigger: ${matchingTrigger.description}
Base message: ${matchingTrigger.micro_explainer}
Context: ${JSON.stringify(context.currentState || {})}

Generate a personalized, brief message.`,
    maxTokens: 100,
    temperature: 0.8,
  });

  // Log delivery
  await supabaseAdmin.from("mdo_deliveries").insert({
    user_id: dbUserId,
    trigger_code: matchingTrigger.trigger_code,
    acknowledged: false,
  });

  return {
    triggerCode: matchingTrigger.trigger_code,
    message: message.response || matchingTrigger.micro_explainer,
    targetExperience: matchingTrigger.target_experience,
  };
}



