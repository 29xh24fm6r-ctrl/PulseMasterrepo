// High-Level Persona Planner
// lib/personas/planner.ts

import { PersonaProfile, MotionProfile } from "./types";
import { resolvePersona, RouterContext } from "./context-router";
import { getEvolvedPersona } from "./evolution";
import { getPersonaUserState, applyUserStateToPersona } from "./memory";
import { selectMotionProfile } from "./motion";
import { getPersonaDNA, decodeDNAToPersona, encodePersonaToDNA, savePersonaDNA } from "./dna";
import { getVoiceProfileByKey } from "@/lib/voices/seed";
import { getUserSafetySettings, applyUserSafetyPreferencesToPersona } from "@/lib/safety/user-preferences";
import { getCompanionState, CompanionState } from "./companion";
import { getMoodResonanceTuning } from "./mood_resonance";
import { getCurrentEmotionState } from "@/lib/emotion-os/server";

export interface PersonaResponsePlan {
  personaProfile: PersonaProfile;
  motionProfile: MotionProfile;
  userState: any | null;
  dnaApplied: boolean;
  evolutionApplied: boolean;
  memoryApplied: boolean;
  companionState: CompanionState | null;
  moodTuningApplied: boolean;
}

export interface PlanPersonaResponseParams {
  userId: string;
  coachId: string;
  basePersona?: PersonaProfile;
  context?: RouterContext;
}

/**
 * Plan persona response with full composition
 */
export async function planPersonaResponse(
  params: PlanPersonaResponseParams
): Promise<PersonaResponsePlan> {
  const { userId, coachId, basePersona, context } = params;

  // 1. Resolve persona via context-router (v2)
  let resolvedPersona: PersonaProfile;
  if (basePersona) {
    resolvedPersona = basePersona;
  } else {
    const resolved = await resolvePersona(userId, context || {
      coachId,
      userEmotion: null,
      currentTime: new Date(),
    });
    resolvedPersona = resolved.persona;
  }

  // 2. Get persona DNA and decode (if exists)
  let dnaApplied = false;
  const dna = await getPersonaDNA(resolvedPersona.id);
  if (dna) {
    resolvedPersona = decodeDNAToPersona(dna, resolvedPersona);
    dnaApplied = true;
  } else {
    // Create initial DNA for this persona
    const newDNA = encodePersonaToDNA(resolvedPersona);
    await savePersonaDNA(resolvedPersona.id, newDNA);
  }

  // 3. Apply evolution stage (v2)
  let evolutionApplied = false;
  try {
    const evolved = await getEvolvedPersona(userId, resolvedPersona.key);
    if (evolved) {
      resolvedPersona = evolved;
      evolutionApplied = true;
    }
  } catch (err) {
    console.warn("[PersonaPlanner] Evolution failed:", err);
  }

  // 4. Load persona_user_state and apply memory deltas (v3)
  let userState = null;
  let memoryApplied = false;
  try {
    userState = await getPersonaUserState(userId, resolvedPersona.id, coachId);
    if (userState) {
      resolvedPersona = applyUserStateToPersona(resolvedPersona, userState);
      memoryApplied = true;
    }
  } catch (err) {
    console.warn("[PersonaPlanner] Memory load failed:", err);
  }

  // 4.5. Apply user safety preferences
  try {
    const safetySettings = await getUserSafetySettings(userId);
    if (safetySettings) {
      resolvedPersona = applyUserSafetyPreferencesToPersona(resolvedPersona, safetySettings);
    }
  } catch (err) {
    console.warn("[PersonaPlanner] Safety preferences failed:", err);
  }

  // 5. Choose motion profile (v3)
  const motionProfile = await selectMotionProfile({
    coachId,
    personaId: resolvedPersona.id,
    userEmotion: context?.userEmotion || null,
    context: {
      crisis: context?.stressScore && context.stressScore > 0.8,
      pepTalk: context?.missionState?.urgentMissions && context.missionState.urgentMissions > 0,
      deepReflection: false, // Can be inferred from coach type
    },
  });

  return {
    personaProfile: resolvedPersona,
    motionProfile,
    userState,
    dnaApplied,
    evolutionApplied,
    memoryApplied,
  };
}

