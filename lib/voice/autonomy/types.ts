// Voice Autonomy Engine v1 Types
// lib/voice/autonomy/types.ts

import { PulseCortexContext } from "@/lib/cortex/types";
import { MicroPlan } from "@/lib/cortex/executive";
import { AutonomyAction } from "@/lib/cortex/autonomy/v3";

export type VoiceAutonomyTrigger =
  | "burnout_detected"
  | "relationship_opportunity"
  | "upcoming_meeting"
  | "task_avoidance"
  | "high_momentum"
  | "life_chapter_transition"
  | "financial_risk_window"
  | "habit_streak_break"
  | "emotion_spike"
  | "autonomy_action_urgent";

export type VoicePersonaKey =
  | "calm"
  | "hype"
  | "command"
  | "warm_advisor"
  | "strategic"
  | "motivational"
  | "confidant";

export interface VoiceAutonomyTriggerConfig {
  id: VoiceAutonomyTrigger;
  name: string;
  description: string;
  defaultPersona: VoicePersonaKey;
  messageClass: "alert" | "suggestion" | "celebration" | "warning" | "guidance";
  urgency: "low" | "medium" | "high";
  cooldownMinutes: number;
  evaluate: (ctx: PulseCortexContext) => boolean;
}

export interface VoiceIntervention {
  id: string;
  trigger: VoiceAutonomyTrigger;
  personaKey: VoicePersonaKey;
  message: string;
  urgency: "low" | "medium" | "high";
  timestamp: string;
  microPlan?: MicroPlan;
  recommendedAction?: AutonomyAction;
  traceEntry?: {
    level: "info" | "debug" | "warn" | "error";
    message: string;
    data?: Record<string, any>;
  };
}

export interface VoiceAutonomyState {
  isLiveModeEnabled: boolean;
  lastIntervention?: VoiceIntervention;
  lastInterventionTime?: string;
  personaPreference?: VoicePersonaKey;
  cooldownTimers: Record<VoiceAutonomyTrigger, number>; // Timestamp of last trigger
}



