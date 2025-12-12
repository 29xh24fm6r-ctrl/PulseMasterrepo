// Council Tone Harmonization
// lib/council/harmonizer.ts

import { PersonaProfile } from "@/lib/personas/types";
import { CouncilAnalysis, CouncilSynthesis, CouncilMode } from "./types";
import { planPersonaResponse } from "@/lib/personas/planner";
import { splitTextIntoPhases, applyMotionToSegments, selectMotionProfile } from "@/lib/personas/motion";

export interface HarmonizeCouncilOutputParams {
  userId?: string;
  primaryCoachId: string;
  councilMode: CouncilMode;
  basePersona: PersonaProfile;
  analyses: CouncilAnalysis[];
  synthesis: CouncilSynthesis;
}

/**
 * Harmonize council output to feel like one persona
 */
export async function harmonizeCouncilOutput(
  params: HarmonizeCouncilOutputParams
): Promise<string> {
  const { userId, primaryCoachId, councilMode, basePersona, synthesis } = params;

  // Get harmonized persona plan for primary coach
  const personaPlan = await planPersonaResponse({
    userId: userId || "",
    coachId: primaryCoachId,
    basePersona,
    context: {
      coachId: primaryCoachId,
      userEmotion: null,
      currentTime: new Date(),
    },
  });

  // Adjust persona based on council mode
  let harmonizedPersona = personaPlan.personaProfile;

  switch (councilMode) {
    case "emotional_support":
      harmonizedPersona.style = {
        ...harmonizedPersona.style,
        warmth: Math.min(100, harmonizedPersona.style.warmth + 10),
        emotional_reflection: Math.min(100, (harmonizedPersona.style.emotional_reflection || 0) + 15),
        energy: Math.max(0, harmonizedPersona.style.energy - 10),
      };
      break;

    case "performance":
      harmonizedPersona.style = {
        ...harmonizedPersona.style,
        energy: Math.min(100, harmonizedPersona.style.energy + 10),
        directiveness: Math.min(100, harmonizedPersona.style.directiveness + 10),
      };
      break;

    case "advisory":
      harmonizedPersona.style = {
        ...harmonizedPersona.style,
        decisiveness: Math.min(100, harmonizedPersona.style.decisiveness + 10),
        warmth: Math.min(100, harmonizedPersona.style.warmth + 5),
      };
      break;

    case "crisis":
      harmonizedPersona.style = {
        ...harmonizedPersona.style,
        warmth: Math.min(100, harmonizedPersona.style.warmth + 20),
        emotional_reflection: Math.min(100, (harmonizedPersona.style.emotional_reflection || 0) + 20),
        energy: Math.max(0, harmonizedPersona.style.energy - 15),
      };
      break;
  }

  // Select motion profile based on mode
  const motionProfile = await selectMotionProfile({
    coachId: primaryCoachId,
    personaId: harmonizedPersona.id,
    userEmotion: null,
    context: {
      crisis: councilMode === "crisis",
      pepTalk: councilMode === "performance",
      deepReflection: councilMode === "emotional_support" || councilMode === "life_navigation",
    },
  });

  // Apply motion to final answer
  const segments = splitTextIntoPhases(synthesis.final_answer, motionProfile.phases);
  const harmonizedSegments = applyMotionToSegments(
    segments,
    harmonizedPersona,
    motionProfile
  );

  return harmonizedSegments.join(" ");
}




