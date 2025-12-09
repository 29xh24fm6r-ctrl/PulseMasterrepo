// Philosophy Training Engine - Generates Training Blueprints

import {
  TrainingRequest,
  TrainingBlueprint,
  TrainingUnit,
  TrainingStyle,
  PhilosophyId,
  BeltRank,
} from "./types";
import { getPhilosophyPath } from "./paths";
import { getMentor } from "./mentors";
import { getFaction } from "./factions";
import { getSkillTree } from "./skill-tree";

// ============================================
// TRAINING THEMES BY PHILOSOPHY
// ============================================

const TRAINING_THEMES: Record<PhilosophyId, string[]> = {
  stoicism: [
    "emotional regulation under pressure",
    "accepting what cannot be changed",
    "transforming obstacles into opportunities",
    "practicing negative visualization",
    "maintaining calm in conflict",
    "focusing on what you control",
    "letting go of anger",
    "responding to criticism",
    "facing fear with reason",
    "practicing gratitude through adversity",
  ],
  samurai: [
    "making decisive cuts in uncertainty",
    "facing death without fear",
    "maintaining honor under pressure",
    "ruthless prioritization",
    "acting without hesitation",
    "cutting through procrastination",
    "facing confrontation directly",
    "eliminating weakness",
    "the warrior's morning ritual",
    "finding calm before battle",
  ],
  taoism: [
    "flowing around obstacles",
    "practicing non-action",
    "yielding to overcome",
    "finding stillness in chaos",
    "emptying the cup",
    "aligning with natural rhythms",
    "leading without force",
    "embracing paradox",
    "returning to simplicity",
    "the power of softness",
  ],
  zen: [
    "present moment awareness",
    "beginner's mind practice",
    "sitting with discomfort",
    "direct experience",
    "releasing attachments",
    "finding Buddha nature",
    "mindful action",
    "the koan as teacher",
    "ordinary mind as the way",
    "chopping wood, carrying water",
  ],
  seven_habits: [
    "being proactive",
    "beginning with the end in mind",
    "putting first things first",
    "thinking win-win",
    "seeking to understand",
    "synergizing with others",
    "sharpening the saw",
    "circle of influence",
    "emotional bank account",
    "private victory before public",
  ],
  discipline: [
    "embracing voluntary hardship",
    "eliminating excuses",
    "morning discipline routines",
    "pushing past the 40%",
    "extreme ownership",
    "default aggressive action",
    "callusing the mind",
    "staying hard",
    "no comfort zone",
    "discipline as freedom",
  ],
  spartan: [
    "training through suffering",
    "frugality and simplicity",
    "unit before self",
    "with shield or on it",
    "brevity of speech",
    "enduring the impossible",
    "strength through adversity",
    "warrior mindset",
    "preparing for battle",
    "the agoge trial",
  ],
  buddhism: [
    "releasing attachment",
    "compassion practice",
    "right speech",
    "mindfulness meditation",
    "impermanence reflection",
    "middle way living",
    "loving-kindness",
    "equanimity practice",
    "suffering and its end",
    "the eightfold path",
  ],
  custom: ["personal growth", "self-mastery", "life challenge"],
};

// ============================================
// DIFFICULTY SCALING
// ============================================

const BELT_DIFFICULTY_BASE: Record<BeltRank, number> = {
  white: 1,
  yellow: 2,
  orange: 2,
  green: 3,
  blue: 3,
  brown: 4,
  black: 4,
  master: 5,
};

const STYLE_DIFFICULTY_MOD: Record<TrainingStyle, number> = {
  micro: -1,
  drill: 0,
  scenario: 0,
  reflection: -1,
  meditation: -1,
  roleplay: 1,
  challenge: 1,
  boss: 2,
};

// ============================================
// XP REWARDS
// ============================================

const STYLE_XP_BASE: Record<TrainingStyle, number> = {
  micro: 10,
  drill: 20,
  scenario: 25,
  reflection: 15,
  meditation: 15,
  roleplay: 35,
  challenge: 40,
  boss: 100,
};

// ============================================
// STYLE AUTO-SELECTION
// ============================================

function selectTrainingStyle(
  belt: BeltRank,
  userProfile?: TrainingRequest["userProfile"]
): TrainingStyle {
  const styles: TrainingStyle[] = ["micro", "drill", "scenario", "reflection", "meditation", "roleplay", "challenge"];
  
  // Filter based on belt and user preferences
  let available = styles;
  
  if (userProfile?.wantsSoftTraining) {
    available = available.filter(s => !["challenge", "boss", "roleplay"].includes(s));
  }
  
  if (userProfile?.prefersShortTurns) {
    available = available.filter(s => ["micro", "drill", "reflection"].includes(s));
  }
  
  // Weight toward more complex styles at higher belts
  const beltOrder: BeltRank[] = ["white", "yellow", "orange", "green", "blue", "brown", "black", "master"];
  const beltIndex = beltOrder.indexOf(belt);
  
  if (beltIndex >= 4 && Math.random() > 0.5) {
    available = available.filter(s => ["scenario", "roleplay", "challenge"].includes(s));
  }
  
  if (available.length === 0) available = ["drill"];
  
  return available[Math.floor(Math.random() * available.length)];
}

// ============================================
// THEME SELECTION
// ============================================

function selectTheme(
  philosophy: PhilosophyId,
  crossPhilosophy?: PhilosophyId,
  focusTags?: string[]
): { theme: string; tags: string[] } {
  const themes = TRAINING_THEMES[philosophy] || TRAINING_THEMES.custom;
  let theme = themes[Math.floor(Math.random() * themes.length)];
  const tags: string[] = [];

  // Add philosophy tag
  tags.push(philosophy);

  // If cross-philosophy, blend themes
  if (crossPhilosophy) {
    const crossThemes = TRAINING_THEMES[crossPhilosophy] || [];
    if (crossThemes.length > 0) {
      const crossTheme = crossThemes[Math.floor(Math.random() * crossThemes.length)];
      theme = `${theme} + ${crossTheme}`;
      tags.push(crossPhilosophy, "hybrid");
    }
  }

  // Add focus tags if provided
  if (focusTags) {
    tags.push(...focusTags);
  }

  // Extract common tags from theme
  if (theme.includes("emotion")) tags.push("emotions");
  if (theme.includes("fear")) tags.push("fear", "courage");
  if (theme.includes("anger")) tags.push("anger", "calm");
  if (theme.includes("conflict")) tags.push("conflict");
  if (theme.includes("decision")) tags.push("decision");
  if (theme.includes("discipline")) tags.push("discipline");
  if (theme.includes("patience")) tags.push("patience");

  return { theme, tags: [...new Set(tags)] };
}

// ============================================
// INSTRUCTION SKELETON GENERATION
// ============================================

function generateInstructionSkeleton(
  style: TrainingStyle,
  theme: string,
  philosophy: PhilosophyId,
  difficulty: number
): string {
  const path = getPhilosophyPath(philosophy);
  const virtues = path?.coreVirtues.join(", ") || "virtue";

  switch (style) {
    case "micro":
      return `A brief 1-2 minute exercise on "${theme}". Focus on one core ${philosophy} principle. Give a single, focused task that can be completed immediately.`;

    case "drill":
      return `A focused drill on "${theme}". Provide 3-5 repetitions or steps. Each step should reinforce ${philosophy} principles of ${virtues}. Difficulty: ${difficulty}/5.`;

    case "scenario":
      return `Present a realistic scenario requiring "${theme}". The user must navigate the situation using ${philosophy} principles. Include specific details and stakes. Difficulty: ${difficulty}/5.`;

    case "reflection":
      return `A journaling exercise on "${theme}". Ask 2-3 deep questions that lead the user to examine their own patterns through the lens of ${philosophy}.`;

    case "meditation":
      return `A guided contemplation on "${theme}". Walk through a ${philosophy}-based meditation or visualization. Include specific imagery and breathing cues.`;

    case "roleplay":
      return `A conversation roleplay exercise on "${theme}". The user will practice responding as a ${philosophy} practitioner would. Provide the scenario setup and the character they'll interact with.`;

    case "challenge":
      return `A challenging real-world exercise on "${theme}". This should push the user outside their comfort zone while staying safe. Apply ${philosophy} principles under pressure. Difficulty: ${difficulty}/5.`;

    case "boss":
      return `A "boss battle" - a culminating challenge on "${theme}". This combines multiple ${philosophy} skills and tests mastery. High stakes, high reward. The user must demonstrate deep understanding. Difficulty: 5/5.`;

    default:
      return `An exercise on "${theme}" using ${philosophy} principles.`;
  }
}

// ============================================
// PROMPT SKELETON GENERATION
// ============================================

function generatePromptSkeleton(style: TrainingStyle): string {
  switch (style) {
    case "micro":
      return "Complete this quick exercise and describe what you notice.";
    case "drill":
      return "Work through each step and share your experience.";
    case "scenario":
      return "How would you handle this situation? Describe your approach.";
    case "reflection":
      return "Reflect on these questions and write your honest answers.";
    case "meditation":
      return "After completing the meditation, share what arose for you.";
    case "roleplay":
      return "Respond as you would in this conversation.";
    case "challenge":
      return "Complete this challenge and report back on what happened.";
    case "boss":
      return "Face this trial and demonstrate your mastery.";
    default:
      return "Complete the exercise and share your response.";
  }
}

// ============================================
// TITLE GENERATION
// ============================================

function generateTitle(
  philosophy: PhilosophyId,
  crossPhilosophy: PhilosophyId | undefined,
  theme: string,
  style: TrainingStyle
): string {
  const styleLabels: Record<TrainingStyle, string> = {
    micro: "Quick",
    drill: "Drill",
    scenario: "Scenario",
    reflection: "Reflection",
    meditation: "Meditation",
    roleplay: "Sparring",
    challenge: "Challenge",
    boss: "Boss Battle",
  };

  const label = styleLabels[style];
  const themeWords = theme.split(" ").slice(0, 3).join(" ");

  if (crossPhilosophy) {
    return `${label}: ${themeWords} (${philosophy} + ${crossPhilosophy})`;
  }

  return `${label}: ${themeWords}`;
}

// ============================================
// XP CATEGORY MAPPING
// ============================================

function getXpCategory(philosophy: PhilosophyId, tags: string[]): "IXP" | "PXP" | "MXP" | "DXP" {
  // Default to IXP for internal/philosophical work
  if (tags.includes("emotions") || tags.includes("calm") || tags.includes("mindfulness")) {
    return "IXP";
  }
  if (tags.includes("conflict") || tags.includes("confrontation") || tags.includes("leadership")) {
    return "PXP";
  }
  if (tags.includes("discipline") || tags.includes("routine")) {
    return "MXP";
  }
  return "IXP";
}

// ============================================
// MAIN BLUEPRINT GENERATOR
// ============================================

export function generateTrainingBlueprint(req: TrainingRequest): TrainingBlueprint {
  // 1. Resolve style
  const style: TrainingStyle = req.style === "auto"
    ? selectTrainingStyle(req.belt, req.userProfile)
    : req.style;

  // 2. Calculate difficulty
  const baseDifficulty = BELT_DIFFICULTY_BASE[req.belt];
  const styleMod = STYLE_DIFFICULTY_MOD[style];
  let difficulty = Math.max(1, Math.min(5, baseDifficulty + styleMod));

  // Adjust for user profile
  if (req.userProfile?.wantsSoftTraining) {
    difficulty = Math.max(1, difficulty - 1);
  }

  // 3. Select theme and tags
  const { theme, tags } = selectTheme(req.philosophy, req.crossPhilosophyWith, req.focusTags);

  // 4. Generate title hint
  const titleHint = generateTitle(req.philosophy, req.crossPhilosophyWith, theme, style);

  // 5. Generate instruction skeleton
  const instructionsSkeleton = generateInstructionSkeleton(style, theme, req.philosophy, difficulty);

  // 6. Generate prompt skeleton
  const promptSkeleton = generatePromptSkeleton(style);

  // 7. Calculate XP
  const xpBase = STYLE_XP_BASE[style] * difficulty;

  // 8. Get XP category
  const xpCategory = getXpCategory(req.philosophy, tags);

  return {
    philosophy: req.philosophy,
    crossPhilosophy: req.crossPhilosophyWith,
    style,
    difficulty,
    belt: req.belt,
    theme,
    tags,
    titleHint,
    instructionsSkeleton,
    promptSkeleton,
    xpBase,
    xpCategory,
  };
}

// ============================================
// TRAINING UNIT FACTORY (from LLM response)
// ============================================

export function createTrainingUnit(
  blueprint: TrainingBlueprint,
  llmResponse: {
    title?: string;
    instructions?: string;
    promptForUser?: string;
    mentorGuidance?: string;
  },
  mentorId?: string,
  factionId?: string
): TrainingUnit {
  const id = `train_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Determine if roleplay is appropriate
  let roleplayConfig: TrainingUnit["optionalRoleplayConfig"];
  if (blueprint.style === "roleplay" || blueprint.style === "boss") {
    roleplayConfig = {
      useRoleplayCoach: true,
      suggestedContextType: blueprint.tags.includes("conflict") ? "personal_conflict" : "social_skills_practice",
    };
  }

  // Estimate time
  const timeByStyle: Record<TrainingStyle, number> = {
    micro: 2,
    drill: 5,
    scenario: 10,
    reflection: 10,
    meditation: 10,
    roleplay: 15,
    challenge: 20,
    boss: 30,
  };

  return {
    id,
    title: llmResponse.title || blueprint.titleHint,
    philosophy: blueprint.philosophy,
    crossPhilosophy: blueprint.crossPhilosophy,
    style: blueprint.style,
    difficulty: blueprint.difficulty as 1 | 2 | 3 | 4 | 5,
    beltLevel: blueprint.belt,
    instructions: llmResponse.instructions || blueprint.instructionsSkeleton,
    promptForUser: llmResponse.promptForUser || blueprint.promptSkeleton,
    mentorGuidance: llmResponse.mentorGuidance,
    optionalRoleplayConfig: roleplayConfig,
    suggestedXpReward: blueprint.xpBase,
    suggestedIxp: blueprint.xpCategory === "IXP" ? blueprint.xpBase : undefined,
    suggestedPxp: blueprint.xpCategory === "PXP" ? blueprint.xpBase : undefined,
    suggestedMxp: blueprint.xpCategory === "MXP" ? blueprint.xpBase : undefined,
    tags: blueprint.tags,
    supportsMultiplayer: ["challenge", "boss"].includes(blueprint.style),
    multiplayerModeHint: blueprint.style === "boss" ? "ghost" : undefined,
    estimatedMinutes: timeByStyle[blueprint.style] || 10,
  };
}
