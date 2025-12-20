// Coach Context Builder (Cortex-Driven)
// lib/coaching/cortex/context.ts

import "server-only";

import { getWorkCortexContextForUser } from "@/lib/cortex/context";
import { CoachContext } from "./types";

/**
 * Build coach context from Cortex
 */
export async function buildCoachContext(userId: string): Promise<CoachContext> {
  const cortex = await getWorkCortexContextForUser(userId);

  return {
    cortex,
    emotion: cortex.emotion,
    xp: cortex.xp,
    longitudinal: cortex.longitudinal,
    domains: cortex.domains,
    memory: cortex.memory,
  };
}



