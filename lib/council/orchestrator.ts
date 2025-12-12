// Coach Council Orchestrator - Main Entry Point
// lib/council/orchestrator.ts

import { detectCouncilNeed } from "./triggers";
import { buildCouncilRoster } from "./roster";
import { runSafetyPreCheck, runSafetyPostCheck } from "@/lib/safety/engine";
import { planPersonaResponse } from "@/lib/personas/planner";
import { runCoachLLMAnalysis, runCouncilSynthesis } from "./protocol";
import { harmonizeCouncilOutput } from "./harmonizer";
import * as storage from "./storage";
import { getDefaultVoiceForCoach } from "@/lib/voices/registry";
import { getVoiceProfileByKey } from "@/lib/voices/seed";
import { CouncilTriggerContext } from "./types";
import { getLifeArcPlan } from "@/lib/life-arc/planner";

export interface RunCoachCouncilParams {
  userId?: string;
  primaryCoachId: string;
  userInput: string;
  userModel?: any;
}

export interface RunCoachCouncilResult {
  usedCouncil: boolean;
  answer: string;
  sessionId?: string;
}

/**
 * Get base persona for coach
 */
async function getBasePersonaForCoach(coachId: string) {
  const defaultVoiceKey = await getDefaultVoiceForCoach(coachId as any);
  const persona = await getVoiceProfileByKey(defaultVoiceKey);
  if (!persona) {
    throw new Error(`No persona found for coach ${coachId}`);
  }
  return persona as any;
}

/**
 * Build blocked response
 */
function buildBlockedResponse(preCheck: any): string {
  return preCheck.boundaryMessage || "I can't help with that request. How else can I assist you?";
}

/**
 * Run coach council orchestrator
 */
export async function runCoachCouncil(
  params: RunCoachCouncilParams
): Promise<RunCoachCouncilResult> {
  const { userId, primaryCoachId, userInput, userModel } = params;

  // Detect if council is needed
  const trigger = detectCouncilNeed({
    userId,
    primaryCoachId,
    userInput,
    emotionState: userModel?.emotion_state,
    stressScore: userModel?.stress_score ?? 0,
    careerLevel: userModel?.career_level,
    identityFlags: userModel?.identity_flags,
  });

  if (!trigger.useCouncil) {
    return { usedCouncil: false, answer: "" };
  }

  // Safety pre-check
  const pre = await runSafetyPreCheck({
    userId,
    coachId: primaryCoachId,
    userInput,
  });

  if (!pre.allowed && pre.action === "block") {
    return {
      usedCouncil: true,
      answer: buildBlockedResponse(pre),
    };
  }

  // Create session
  const session = await storage.createSession({
    userId,
    primaryCoachId,
    mode: trigger.mode!,
    reason: trigger.reason || "multi_dimension",
  });

  // Build roster
  const roster = buildCouncilRoster({
    mode: trigger.mode!,
    primaryCoachId,
    userModel,
  });

  // Save members after analyses (so we have persona IDs)
  // We'll save members after getting analyses

  // Get life arcs for context
  let lifeArcs: Array<{ name: string; description?: string; priority: number }> | undefined;
  try {
    const lifeArcPlan = await getLifeArcPlan(userId || "");
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

  // Per-member analyses
  const analyses = [];
  for (const member of roster) {
    try {
      const basePersona = await getBasePersonaForCoach(member.coachId);
      const personaPlan = await planPersonaResponse({
        userId: userId || "",
        coachId: member.coachId,
        basePersona,
        context: {
          coachId: member.coachId,
          userEmotion: null,
          currentTime: new Date(),
        },
      });

      const analysis = await runCoachLLMAnalysis({
        coachId: member.coachId,
        persona: personaPlan.personaProfile,
        userInput,
        userModel,
        councilMode: trigger.mode!,
        lifeArcs,
        userId,
      });

      analyses.push(analysis);
      await storage.saveDeliberation(session.id, analysis);

      // Update member with persona ID
      (member as any).personaId = personaPlan.personaProfile.id;
    } catch (err) {
      console.error(`[CouncilOrchestrator] Failed to get analysis from ${member.coachId}:`, err);
      // Continue with other coaches
    }
  }

  // Save members with persona IDs (after analyses)
  await storage.saveMembers(session.id, roster);

  if (analyses.length === 0) {
    // Fallback if all analyses failed
    return {
      usedCouncil: true,
      answer: "I'm having trouble processing that right now. Could you rephrase?",
      sessionId: session.id,
    };
  }

  // Synthesis
  const synthesis = await runCouncilSynthesis({
    mode: trigger.mode!,
    userInput,
    analyses,
    userModel,
  });

  // Harmonize tone/persona
  const primaryBasePersona = await getBasePersonaForCoach(primaryCoachId);
  const primaryPersonaPlan = await planPersonaResponse({
    userId: userId || "",
    coachId: primaryCoachId,
    basePersona: primaryBasePersona,
    context: {
      coachId: primaryCoachId,
      userEmotion: null,
      currentTime: new Date(),
    },
  });

  let finalAnswer = await harmonizeCouncilOutput({
    userId,
    primaryCoachId,
    councilMode: trigger.mode!,
    basePersona: primaryPersonaPlan.personaProfile,
    analyses,
    synthesis,
  });

  // Safety post-check
  const post = await runSafetyPostCheck({
    userId,
    coachId: primaryCoachId,
    modelOutput: finalAnswer,
    userInput,
  });

  finalAnswer = post.finalText;

  // Save summary
  await storage.saveSummary(session.id, synthesis, finalAnswer);

  return {
    usedCouncil: true,
    answer: finalAnswer,
    sessionId: session.id,
  };
}

