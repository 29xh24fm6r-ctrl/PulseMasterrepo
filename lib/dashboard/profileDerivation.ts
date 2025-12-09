// ============================================================================
// PULSE A.C.D. — Profile Derivation (Interview Answers → Profile)
// ============================================================================

import {
  WorkStyle,
  DifficultyMode,
  InterviewAnswer,
  CognitiveProfile,
  ProfessionalIdentity,
  MotivationProfile,
  VisualNoiseTolerance,
  PrimaryMode,
  PreferredTone,
} from "@/types/dashboard";

export interface DerivedProfile {
  work_style: WorkStyle;
  cognitive_profile: CognitiveProfile;
  professional_identity: ProfessionalIdentity;
  motivation_profile: MotivationProfile;
  difficulty_setting: DifficultyMode;
}

export function deriveProfileFromAnswers(answers: InterviewAnswer[]): DerivedProfile {
  const answerMap = new Map<string, unknown>();
  answers.forEach((a) => answerMap.set(a.questionId, a.answer));

  const cognitive = deriveCognitive(answerMap);
  const professional = deriveProfessional(answerMap);
  const motivation = deriveMotivation(answerMap);
  const workStyle = deriveWorkStyle(cognitive, motivation);
  const difficulty = deriveDifficulty(cognitive, motivation);

  return {
    work_style: workStyle,
    cognitive_profile: cognitive,
    professional_identity: professional,
    motivation_profile: motivation,
    difficulty_setting: difficulty,
  };
}

function deriveCognitive(answerMap: Map<string, unknown>): CognitiveProfile {
  const overwhelmed = answerMap.get("overwhelm_tasks") === true;
  const singleAction = answerMap.get("single_vs_list") === "ONE";
  const appSwitching = answerMap.get("app_switching") as string;
  const dashboardStyle = answerMap.get("dashboard_style") as string;

  const hasAdhdLikeTraits = appSwitching === "OFTEN" || (overwhelmed && singleAction);

  let visualNoiseTolerance: VisualNoiseTolerance = "MEDIUM";
  if (dashboardStyle === "CALM" || overwhelmed) visualNoiseTolerance = "LOW";
  else if (dashboardStyle === "ENERGETIC" && !overwhelmed) visualNoiseTolerance = "HIGH";

  return {
    hasAdhdLikeTraits,
    visualNoiseTolerance,
    prefersSingleNextAction: singleAction,
    overwhelmProneTimes: overwhelmed ? ["morning", "after_lunch"] : [],
  };
}

function deriveProfessional(answerMap: Map<string, unknown>): ProfessionalIdentity {
  const workType = (answerMap.get("work_type") as string) || "OTHER";
  const dailyActions = answerMap.get("daily_actions") as string;
  const primaryManagement = answerMap.get("primary_management") as string;
  const relationshipImportance = (answerMap.get("relationship_importance") as number) || 3;

  const coreRepeatedActions = dailyActions
    ? dailyActions.split(/[,\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 3)
    : [];

  let roleTitle = workType;
  if (primaryManagement === "DEALS") roleTitle = "Sales Professional";
  else if (primaryManagement === "PROJECTS") roleTitle = "Project Manager";
  else if (primaryManagement === "CLIENTS") roleTitle = "Account Manager";

  const modeMap: Record<string, PrimaryMode> = {
    SALES: "SALES", MANAGER: "MANAGER", IC: "IC", CREATOR: "CREATOR", OTHER: "OTHER",
  };

  return {
    roleTitle,
    primaryMode: modeMap[workType] || "OTHER",
    coreRepeatedActions,
    relationshipIntensity: relationshipImportance,
  };
}

function deriveMotivation(answerMap: Map<string, unknown>): MotivationProfile {
  const toneMap: Record<string, PreferredTone> = {
    SENSEI: "SENSEI", COACH: "COACH", CALM_ASSISTANT: "CALM_ASSISTANT", HYPE: "HYPE",
  };

  return {
    likesGamification: answerMap.get("xp_motivation") === true,
    likesCelebrations: answerMap.get("celebrations") === true,
    preferredTone: toneMap[(answerMap.get("tone_preference") as string)] || "COACH",
    pushIntensity: Math.min(5, Math.max(1, (answerMap.get("push_intensity") as number) || 3)),
  };
}

function deriveWorkStyle(cognitive: CognitiveProfile, motivation: MotivationProfile): WorkStyle {
  if (cognitive.visualNoiseTolerance === "LOW" || cognitive.prefersSingleNextAction) {
    return "FOCUS_MINIMAL";
  }
  if (motivation.likesGamification && motivation.likesCelebrations && cognitive.visualNoiseTolerance === "HIGH") {
    return "GAMIFIED_HUD";
  }
  return "HYBRID";
}

function deriveDifficulty(cognitive: CognitiveProfile, motivation: MotivationProfile): DifficultyMode {
  if (cognitive.hasAdhdLikeTraits || cognitive.visualNoiseTolerance === "LOW") return "EASY";
  if (motivation.pushIntensity >= 4) return "HARD";
  return "DYNAMIC";
}

export function createDefaultProfile(): DerivedProfile {
  return {
    work_style: "HYBRID",
    cognitive_profile: {
      hasAdhdLikeTraits: false,
      visualNoiseTolerance: "MEDIUM",
      prefersSingleNextAction: false,
      overwhelmProneTimes: [],
    },
    professional_identity: {
      roleTitle: "",
      primaryMode: "OTHER",
      coreRepeatedActions: [],
      relationshipIntensity: 3,
    },
    motivation_profile: {
      likesGamification: true,
      likesCelebrations: true,
      preferredTone: "COACH",
      pushIntensity: 3,
    },
    difficulty_setting: "DYNAMIC",
  };
}
