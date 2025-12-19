// LLM Reply Generation
// lib/coaching/llm-replies.ts

import { ReplyIntent } from "./reply-intents";
import { llmComplete } from "@/lib/llm/client";
import { CoachId } from "./orchestrator";

export interface GenerateCoachReplyArgs {
  coachId: CoachId;
  userMessage: string;
  intent: ReplyIntent;
  voiceProfile: {
    voiceId: string;
    speed: number;
    energy: number;
    warmth: number;
    temporary: boolean;
    emotion?: string | null;
  };
  emotion: {
    primary: string | null;
    intensity?: number;
  };
  contactId?: string | null; // Optional: if coaching about a specific contact
  contactPlaybook?: {
    summary: string;
    doList: string[];
    dontList: string[];
    channelGuidelines: string;
    toneGuidelines: string;
    conflictStrategy: string;
    persuasionLevers: string;
  } | null; // Optional: pre-loaded playbook
  careerContext?: {
    level: string;
    progressToNext: number;
    activeMissions: string[];
    recentPromotion: boolean;
  } | null; // Optional: career context
  context?: {
    previousMessages?: Array<{ role: string; content: string }>;
    scenarioInfo?: any;
  };
}

export async function generateCoachReply(
  args: GenerateCoachReplyArgs
): Promise<string> {
  const { userId, coachId, userMessage, intent, voiceProfile, emotion, contactId, contactPlaybook, careerContext, context } = args;

  // Get life arcs for context
  let lifeArcs: Array<{ name: string; description?: string; priority: number }> | null = null;
  try {
    const { getLifeArcPlan } = await import("@/lib/life-arc/planner");
    const lifeArcPlan = await getLifeArcPlan(userId);
    if (lifeArcPlan.arcs.length > 0) {
      lifeArcs = lifeArcPlan.arcs.map((a) => ({
        name: a.name,
        description: a.description,
        priority: a.priority,
      }));
    }
  } catch (err) {
    // Life arcs optional
  }

  // Get weekly objectives and daily focus for context
  let weeklyObjectives: string[] = [];
  let dailyFocus: string[] = [];
  try {
    const { getWeeklyObjectives, getDailyFocus } = await import("@/lib/life-arc/autopilot/integration");
    const objs = await getWeeklyObjectives(userId);
    const focus = await getDailyFocus(userId);
    weeklyObjectives = objs.map((o) => o.summary);
    dailyFocus = focus.map((f) => f.title);
  } catch (err) {
    // Optional
  }

  const systemPrompt = await buildSystemPrompt(coachId, intent, contactPlaybook || null, careerContext || null, lifeArcs);
  const userPrompt = buildUserPrompt(userMessage, intent, emotion, voiceProfile, context, careerContext || null);

  // Wrap LLM call with safety wrapper
  let reply: string;
  try {
    const { runSafeCoachInteraction } = await import("@/lib/coaches/safe-coach-wrapper");
    
    reply = await runSafeCoachInteraction({
      userId,
      coachId,
      personaId: voiceProfile.voiceId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      llmCall: async (messages) => {
        const systemMsg = messages.find((m) => m.role === "system");
        const userMsg = messages.find((m) => m.role === "user");
        return await llmComplete(userMsg?.content || "", {
          system: systemMsg?.content || systemPrompt,
          model: "gpt-4o-mini",
          temperature: 0.7,
          max_tokens: Math.ceil(intent.maxWords * 1.5),
        });
      },
    });
  } catch (err) {
    console.warn("[LLMReplies] Safety wrapper failed, using direct call:", err);
    // Fallback to direct call if safety wrapper fails
    reply = await llmComplete(userPrompt, {
      system: systemPrompt,
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: Math.ceil(intent.maxWords * 1.5),
    });
  }

  try {
    // Apply voice transformation using Persona Engine v3 (Memory + Motion + DNA)
    let transformedReply = reply || `I understand. Let me help you with that.`;
    
    try {
      const { planPersonaResponse } = await import("@/lib/personas/planner");
      const { splitTextIntoPhases, applyMotionToSegments } = await import("@/lib/personas/motion");
      const { transformTextForVoice } = await import("@/lib/voices/transform");
      
      // Plan persona response with full composition
      const plan = await planPersonaResponse({
        userId,
        coachId: coachId as any,
        context: {
          coachId: coachId as any,
          userEmotion: emotion,
          jobContext: careerContext ? {
            level: careerContext.level,
            progressToNext: careerContext.progressToNext,
          } : undefined,
          userPreferences: context?.userPreferences,
        },
      });
      
      // Apply motion to response
      const segments = splitTextIntoPhases(transformedReply, plan.motionProfile.phases);
      const motionTransformed = applyMotionToSegments(
        segments,
        plan.personaProfile,
        plan.motionProfile
      );
      
      transformedReply = motionTransformed.join(" ");
    } catch (err) {
      console.warn("[LLMReplies] Persona v3 transformation failed:", err);
      // Fallback to v2
      try {
        const { resolvePersona } = await import("@/lib/personas/context-router");
        const { transformTextForVoice } = await import("@/lib/voices/transform");
        
        const resolvedPersona = await resolvePersona(
          userId,
          {
            coachId: coachId as any,
            userEmotion: emotion,
            jobContext: careerContext ? {
              level: careerContext.level,
              progressToNext: careerContext.progressToNext,
            } : undefined,
            userPreferences: context?.userPreferences,
          }
        );
        
        transformedReply = transformTextForVoice({
          originalText: transformedReply,
          voiceStyle: resolvedPersona.persona.style,
        });
      } catch (fallbackErr) {
        console.warn("[LLMReplies] Fallback persona transformation failed:", fallbackErr);
        // Final fallback to basic voice transformation
        try {
          const { resolveVoice } = await import("@/lib/voices/router");
          const { transformTextForVoice } = await import("@/lib/voices/transform");
          
          const resolvedVoice = await resolveVoice({
            coachId: coachId as any,
            userEmotion: emotion,
            careerContext: careerContext || null,
          });
          
          transformedReply = transformTextForVoice({
            originalText: transformedReply,
            voiceStyle: resolvedVoice.profile.style,
          });
        } catch (finalErr) {
          console.warn("[LLMReplies] Final fallback failed:", finalErr);
        }
      }
    }

    return transformedReply;
  } catch (error) {
    console.error("[LLMReplies] Error generating reply:", error);
    return `I'm here to help. Can you tell me more about what you're experiencing?`;
  }
}

async function buildSystemPrompt(
  coachId: string,
  intent: ReplyIntent,
  contactPlaybook?: any | null,
  careerContext?: { level: string; progressToNext: number; activeMissions: string[]; recentPromotion: boolean } | null,
  lifeArcs?: Array<{ name: string; description?: string; priority: number }> | null
): Promise<string> {
  const coachDescriptions: Record<string, string> = {
    sales: "You are a Sales Coach focused on helping users improve their sales skills, handle objections, and close deals effectively.",
    confidant: "You are a Confidant Coach - a trusted advisor who provides emotional support, validation, and gentle guidance.",
    executive: "You are an Executive Function Coach who helps users organize, plan, and execute with clarity and efficiency.",
    warrior: "You are a Warrior Coach who pushes users to excel, challenges them to grow, and demands excellence.",
    negotiation: "You are a Negotiation Coach who helps users develop strategic negotiation skills and achieve better outcomes.",
    emotional: "You are an Emotional Coach focused on emotional intelligence, self-awareness, and managing difficult feelings.",
    strategy: "You are a Strategy Coach who helps users think long-term, anticipate challenges, and plan strategically.",
  };

  const structureGuidelines: Record<string, string> = {
    bullet_plan: "Structure your reply as a clear, numbered or bulleted list of actionable steps.",
    short_paragraph: "Write a concise paragraph (2-4 sentences) that flows naturally.",
    dialogue: "Engage in a brief back-and-forth style, asking a clarifying question if helpful.",
    story: "Use a brief, relevant analogy or story to illustrate your point (keep it very short).",
  };

  const directnessGuidelines: Record<string, string> = {
    soft: "Use gentle, supportive language. Validate feelings first. Be warm and understanding.",
    balanced: "Be direct but respectful. Balance empathy with actionable guidance.",
    hard: "Challenge the user directly. Call out excuses. Push them to higher standards. Be firm but caring.",
  };

  let basePrompt = `
You are the Pulse "${coachId}" coach.

${coachDescriptions[coachId] || "You are a supportive AI coach."}

Your current reply intent is: ${intent.label}
Description: ${intent.description}

Guidelines:
- Max words: ${intent.maxWords} (be concise!)
- Directness: ${intent.directness}
  ${directnessGuidelines[intent.directness]}
- Structure: ${intent.structure}
  ${structureGuidelines[intent.structure]}
- Focus: ${intent.focus === "emotion" ? "Prioritize emotional support and validation." : intent.focus === "action" ? "Prioritize concrete, actionable steps." : "Balance emotional support with actionable guidance."}

Always stay within this intent unless user safety requires otherwise. Be authentic, helpful, and aligned with your coach persona.`;

  if (contactPlaybook) {
    basePrompt += `\n\nIMPORTANT: The user is currently dealing with a specific contact. Here's how to best communicate with this person:\n\n`;
    basePrompt += `Summary: ${contactPlaybook.summary}\n\n`;
    basePrompt += `DO:\n${contactPlaybook.doList.map((d) => `- ${d}`).join("\n")}\n\n`;
    basePrompt += `DON'T:\n${contactPlaybook.dontList.map((d) => `- ${d}`).join("\n")}\n\n`;
    basePrompt += `Channel: ${contactPlaybook.channelGuidelines}\n`;
    basePrompt += `Tone: ${contactPlaybook.toneGuidelines}\n`;
    basePrompt += `Conflict Strategy: ${contactPlaybook.conflictStrategy}\n`;
    basePrompt += `Motivators: ${contactPlaybook.persuasionLevers}\n\n`;
    basePrompt += `Tailor your advice and roleplay to match this person's communication style.`;
  }

  if (careerContext) {
    basePrompt += `\n\nCareer Context:\n`;
    basePrompt += `- Current Level: ${careerContext.level.charAt(0).toUpperCase() + careerContext.level.slice(1)}\n`;
    basePrompt += `- Progress to Next Level: ${Math.round(careerContext.progressToNext * 100)}%\n`;
    if (careerContext.activeMissions.length > 0) {
      basePrompt += `- Active Missions: ${careerContext.activeMissions.join(", ")}\n`;
    }
      if (careerContext.recentPromotion) {
        basePrompt += `- Recent Promotion: User just leveled up! Celebrate this achievement.\n`;
      }
      basePrompt += `\nConsider how your advice might help the user progress in their career and complete active missions.`;
    }

    // Add life arcs context
    if (lifeArcs && lifeArcs.length > 0) {
      basePrompt += `\n\nUser's Active Life Arcs (Main Quests):\n${lifeArcs
        .map((arc, idx) => `${idx + 1}. ${arc.name} (Priority ${arc.priority})${arc.description ? ` - ${arc.description}` : ""}`)
        .join("\n")}\n\nWhen relevant, tie your advice to these arcs and help move them forward.`;
    }

    // Add weekly objectives and daily focus
    if (weeklyObjectives.length > 0) {
      basePrompt += `\n\nThis Week's Life Arc Objectives:\n${weeklyObjectives.map((o) => `- ${o}`).join("\n")}`;
    }

    if (dailyFocus.length > 0) {
      basePrompt += `\n\nToday's Life Focus:\n${dailyFocus.map((f) => `- ${f}`).join("\n")}`;
    }

    // Add companion highlights (v5) - get relevant highlights
    try {
      const { getRelevantHighlights } = await import("@/lib/personas/callbacks");
      const highlights = await getRelevantHighlights({
        userId,
        personaId: voiceProfile.voiceId, // Assuming voiceId maps to personaId
        coachId,
        contextTags: context?.scenarioInfo?.tags,
        limit: 2, // Max 2 callbacks per interaction
      });

      if (highlights.length > 0) {
        basePrompt += `\n\nRelevant Past Context (use sparingly, 1-2 references max):\n${highlights
          .map((h) => `- ${h.summary}`)
          .join("\n")}\n\nWhen referencing past events, use phrases like "Last time we talked about..." or "You mentioned..." - never use absolute language like "You always..." or "You never...".`;
      }
    } catch (err) {
      // Optional
    }

    // Add strategy context (Strategy Engine v1)
    try {
      const { getCurrentStrategy } = await import("@/lib/strategy/api");
      const strategy = await getCurrentStrategy(userId);
      if (strategy && strategy.selectedPath) {
        const relevantPillars = strategy.pillars.filter((p) => {
          // Match pillar category to coach
          if (coachId === "career" && p.category === "career") return true;
          if (coachId === "confidant" && p.category === "healing") return true;
          if (coachId === "sales" && p.category === "career") return true;
          return p.priority === 1; // Always include top priority
        });

        basePrompt += `\n\nUser's Current Strategy (${strategy.horizonDays}-day):\n`;
        basePrompt += `Selected Path: ${strategy.selectedPath.name}\n`;
        basePrompt += `Description: ${strategy.selectedPath.description}\n`;
        if (relevantPillars.length > 0) {
          basePrompt += `Relevant Pillars:\n${relevantPillars
            .map((p) => `- ${p.title}: ${p.description}`)
            .join("\n")}\n`;
        }
        basePrompt += `\nPrioritize advice that supports this strategy unless the user explicitly requests something else.`;
      }
    } catch (err) {
      // Optional
    }

    return basePrompt.trim();
}

function buildUserPrompt(
  userMessage: string,
  intent: ReplyIntent,
  emotion: { primary: string | null; intensity?: number },
  voiceProfile: { voiceId: string; energy: number; warmth: number },
  context?: { previousMessages?: Array<{ role: string; content: string }>; scenarioInfo?: any },
  careerContext?: { level: string; progressToNext: number; activeMissions: string[]; recentPromotion: boolean } | null
): string {
  let prompt = `User message:
${userMessage}

Detected emotion: ${emotion.primary ?? "unknown"} (intensity: ${emotion.intensity ?? "n/a"})

Voice style (for guidance on tone - you are not an audio engine):
- Voice: ${voiceProfile.voiceId}
- Energy: ${voiceProfile.energy}
- Warmth: ${voiceProfile.warmth}

Write a reply that matches the reply intent "${intent.label}" and its description.`;

  if (context?.previousMessages && context.previousMessages.length > 0) {
    prompt += `\n\nPrevious conversation context:\n${context.previousMessages
      .slice(-3)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n")}`;
  }

  if (context?.scenarioInfo) {
    prompt += `\n\nScenario context: ${JSON.stringify(context.scenarioInfo)}`;
  }

  if (context?.relevantInsights) {
    prompt += `\n\nInsights from other coaches:\n${context.relevantInsights}\n\nReference these insights naturally if relevant, but don't force them.`;
  }

  if (careerContext && careerContext.activeMissions.length > 0) {
    prompt += `\n\nActive Career Missions: ${careerContext.activeMissions.join(", ")}\nConsider how your response might help the user complete these missions.`;
  }

  return prompt.trim();
}

