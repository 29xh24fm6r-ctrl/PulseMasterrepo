// Cortex-Driven Coaches v2 Types
// lib/coaching/cortex/types.ts

import { PulseCortexContext } from "@/lib/cortex/types";
import { MicroPlan } from "@/lib/cortex/executive";
import { AutonomyAction } from "@/lib/cortex/autonomy/v3";
import { PulseTraceEntry } from "@/lib/cortex/trace/types";

export interface CoachContext {
  cortex: PulseCortexContext;
  emotion: PulseCortexContext["emotion"];
  xp: PulseCortexContext["xp"];
  longitudinal: PulseCortexContext["longitudinal"];
  domains: PulseCortexContext["domains"];
  memory: PulseCortexContext["memory"];
}

export interface CoachPersona {
  key: string;
  name: string;
  description: string;
  styleProfile: {
    tone: "warm" | "direct" | "supportive" | "challenging" | "analytical" | "motivational";
    pacing: "slow" | "moderate" | "fast";
    authority: "peer" | "mentor" | "expert" | "friend";
    formality: "casual" | "professional" | "formal";
  };
  domainPriorities: Array<{
    domain: "work" | "relationships" | "finance" | "life" | "strategy";
    weight: number; // 0-1
  }>;
  emotionalHeuristics: {
    whenStressed: "calm" | "encourage" | "challenge" | "support";
    whenLowEnergy: "rest" | "motivate" | "simplify" | "energize";
    whenHighMomentum: "amplify" | "channel" | "sustain" | "expand";
  };
  signatureBehaviors: string[];
  traceSource: "coach_motivational" | "coach_confidant" | "coach_sales" | "coach_productivity" | "coach_strategic";
}

export interface CoachOutput {
  message: string;
  suggestedActions?: AutonomyAction[];
  microPlan?: MicroPlan;
  autonomyTriggers?: Array<{
    type: string;
    domain: string;
    metadata: Record<string, any>;
  }>;
  traceEntries: Array<{
    level: PulseTraceEntry["level"];
    message: string;
    data?: Record<string, any>;
  }>;
  persona: {
    key: string;
    name: string;
    reasoning: string; // Why this persona responded this way
  };
}



