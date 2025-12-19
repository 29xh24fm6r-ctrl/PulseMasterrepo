// Voice Session Manager
// lib/voice-os/session-manager.ts

import { supabaseAdmin } from "@/lib/supabase";
import { getWorkCortexContextForUser } from "@/lib/cortex/context";
import { VoiceSession, VoiceContext, VoiceBriefing } from "./types";
import { v4 as uuidv4 } from "uuid";

/**
 * Create new voice session
 */
export async function createVoiceSession(userId: string): Promise<VoiceSession> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  const sessionId = uuidv4();
  const now = new Date().toISOString();

  const session: VoiceSession = {
    id: sessionId,
    userId: dbUserId,
    startedAt: now,
    lastActivityAt: now,
    state: "greeting",
    context: {
      conversationHistory: [],
    },
    interruptions: 0,
  };

  return session;
}

/**
 * Update voice session state
 */
export function updateVoiceSession(
  session: VoiceSession,
  updates: Partial<VoiceSession>
): VoiceSession {
  return {
    ...session,
    ...updates,
    lastActivityAt: new Date().toISOString(),
  };
}

/**
 * Add conversation turn
 */
export function addConversationTurn(
  session: VoiceSession,
  role: "user" | "pulse",
  content: string
): VoiceSession {
  return {
    ...session,
    context: {
      ...session.context,
      conversationHistory: [
        ...session.context.conversationHistory,
        {
          role,
          content,
          timestamp: new Date().toISOString(),
        },
      ],
    },
  };
}

/**
 * Generate voice briefing from Cortex context
 */
export async function generateVoiceBriefing(userId: string): Promise<VoiceBriefing> {
  const ctx = await getWorkCortexContextForUser(userId);

  // Extract priorities
  const priorities = ctx.domains.strategy?.currentQuarterFocus?.bigThree || [
    "Focus on high-impact work",
    "Strengthen key relationships",
    "Maintain energy balance",
  ];

  // Extract opportunities
  const opportunities: string[] = [];
  const relationships = ctx.domains.relationships?.keyPeople || [];
  const opportunitiesList = relationships.filter(
    (p) => p.daysSinceInteraction > 30 && p.daysSinceInteraction < 60
  );
  for (const opp of opportunitiesList.slice(0, 3)) {
    opportunities.push(`Reconnect with ${opp.name}`);
  }

  // Extract risks
  const risks: string[] = [];
  const burnoutPatterns = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "burnout_cycle"
  );
  if (burnoutPatterns.length > 0) {
    risks.push("Burnout risk detected");
  }

  // Extract relationship touches
  const relationshipTouches = relationships
    .filter((p) => p.daysSinceInteraction > 30)
    .slice(0, 3)
    .map((p) => p.name);

  // Extract suggested actions
  const suggestedActions: string[] = [];
  const workQueue = ctx.domains.work?.queue || [];
  const highPriority = workQueue.filter((item) => item.priority === "high").slice(0, 3);
  for (const item of highPriority) {
    suggestedActions.push(item.title);
  }

  return {
    emotion: ctx.emotion?.detected_emotion || "neutral",
    energy: ctx.cognitiveProfile?.currentEnergyLevel || 0.5,
    priorities,
    opportunities,
    risks,
    relationshipTouches,
    suggestedActions,
  };
}

/**
 * Convert briefing to spoken narrative
 */
export function briefingToNarrative(briefing: VoiceBriefing, persona: string = "warm_advisor"): string {
  const personaGreetings: Record<string, string> = {
    warm_advisor: "Good morning. Let me share what matters today.",
    strategic: "Here's your strategic briefing for today.",
    command: "Listen up. Here's what needs your attention.",
    calm: "Let's start with a calm overview of your day.",
    hype: "Let's go! Here's what's happening today.",
  };

  const greeting = personaGreetings[persona] || personaGreetings.warm_advisor;

  let narrative = `${greeting}\n\n`;

  // Emotion and energy
  narrative += `You're feeling ${briefing.emotion} with ${Math.round(briefing.energy * 100)}% energy.\n\n`;

  // Priorities
  if (briefing.priorities.length > 0) {
    narrative += `Your top priorities today are:\n`;
    for (let i = 0; i < briefing.priorities.length; i++) {
      narrative += `${i + 1}. ${briefing.priorities[i]}\n`;
    }
    narrative += "\n";
  }

  // Opportunities
  if (briefing.opportunities.length > 0) {
    narrative += `I've identified ${briefing.opportunities.length} opportunities:\n`;
    for (const opp of briefing.opportunities) {
      narrative += `- ${opp}\n`;
    }
    narrative += "\n";
  }

  // Risks
  if (briefing.risks.length > 0) {
    narrative += `There are ${briefing.risks.length} risks to watch:\n`;
    for (const risk of briefing.risks) {
      narrative += `- ${risk}\n`;
    }
    narrative += "\n";
  }

  // Relationship touches
  if (briefing.relationshipTouches.length > 0) {
    narrative += `People who need your attention: ${briefing.relationshipTouches.join(", ")}.\n\n`;
  }

  // Suggested actions
  if (briefing.suggestedActions.length > 0) {
    narrative += `I suggest focusing on: ${briefing.suggestedActions.join(", ")}.\n\n`;
  }

  narrative += "What would you like to focus on first?";

  return narrative;
}



