// Philosophy Skill Trees - Progression & Mastery

import { SkillNode, PhilosophyId, BeltRank, BELT_XP_THRESHOLDS } from "./types";

// ============================================
// STOICISM SKILL TREE
// ============================================

const STOIC_SKILLS: SkillNode[] = [
  // White Belt (Foundation)
  {
    id: "stoic_dichotomy",
    philosophy: "stoicism",
    name: "Dichotomy of Control",
    description: "Distinguish between what you can and cannot control.",
    beltRequired: "white",
    xpRequired: 0,
    parents: [],
    tags: ["foundation", "control", "acceptance"],
    icon: "⚖️",
    maxLevel: 5,
  },
  {
    id: "stoic_present_moment",
    philosophy: "stoicism",
    name: "Present Moment Focus",
    description: "Concentrate on the here and now, not past regrets or future anxieties.",
    beltRequired: "white",
    xpRequired: 100,
    parents: [],
    tags: ["presence", "mindfulness", "focus"],
    icon: "🎯",
    maxLevel: 5,
  },
  // Yellow Belt
  {
    id: "stoic_negative_vis",
    philosophy: "stoicism",
    name: "Negative Visualization",
    description: "Contemplate loss to appreciate what you have and prepare for adversity.",
    beltRequired: "yellow",
    xpRequired: 500,
    parents: ["stoic_dichotomy"],
    tags: ["visualization", "gratitude", "preparation"],
    icon: "👁️",
    maxLevel: 5,
  },
  {
    id: "stoic_emotional_reg",
    philosophy: "stoicism",
    name: "Emotional Regulation",
    description: "Observe emotions without being controlled by them.",
    beltRequired: "yellow",
    xpRequired: 600,
    parents: ["stoic_dichotomy", "stoic_present_moment"],
    tags: ["emotions", "calm", "regulation"],
    icon: "🧘",
    maxLevel: 10,
  },
  // Orange Belt
  {
    id: "stoic_obstacle_way",
    philosophy: "stoicism",
    name: "The Obstacle Is The Way",
    description: "Transform setbacks into opportunities for growth.",
    beltRequired: "orange",
    xpRequired: 1500,
    parents: ["stoic_negative_vis"],
    tags: ["adversity", "growth", "reframe"],
    icon: "🏔️",
    maxLevel: 5,
  },
  {
    id: "stoic_amor_fati",
    philosophy: "stoicism",
    name: "Amor Fati",
    description: "Love your fate. Embrace everything that happens as necessary.",
    beltRequired: "orange",
    xpRequired: 2000,
    parents: ["stoic_obstacle_way", "stoic_emotional_reg"],
    tags: ["acceptance", "fate", "love"],
    icon: "❤️‍🔥",
    maxLevel: 5,
  },
  // Green Belt
  {
    id: "stoic_memento_mori",
    philosophy: "stoicism",
    name: "Memento Mori",
    description: "Remember death to live with urgency and purpose.",
    beltRequired: "green",
    xpRequired: 3500,
    parents: ["stoic_amor_fati"],
    tags: ["death", "purpose", "urgency"],
    icon: "💀",
    maxLevel: 5,
  },
  {
    id: "stoic_virtue_action",
    philosophy: "stoicism",
    name: "Virtue in Action",
    description: "Embody wisdom, courage, justice, and temperance in daily life.",
    beltRequired: "green",
    xpRequired: 4000,
    parents: ["stoic_emotional_reg", "stoic_obstacle_way"],
    tags: ["virtue", "action", "character"],
    icon: "⚡",
    maxLevel: 10,
  },
  // Blue Belt
  {
    id: "stoic_philosopher_king",
    philosophy: "stoicism",
    name: "Philosopher's Duty",
    description: "Lead others through example and service.",
    beltRequired: "blue",
    xpRequired: 7000,
    parents: ["stoic_virtue_action", "stoic_memento_mori"],
    tags: ["leadership", "service", "example"],
    icon: "👑",
    maxLevel: 5,
  },
];

// ============================================
// SAMURAI SKILL TREE
// ============================================

const SAMURAI_SKILLS: SkillNode[] = [
  // White Belt
  {
    id: "samurai_honor",
    philosophy: "samurai",
    name: "Code of Honor",
    description: "Understand and internalize the principles of bushido.",
    beltRequired: "white",
    xpRequired: 0,
    parents: [],
    tags: ["honor", "bushido", "foundation"],
    icon: "🎌",
    maxLevel: 5,
  },
  {
    id: "samurai_presence",
    philosophy: "samurai",
    name: "Warrior's Presence",
    description: "Cultivate alert awareness and readiness in every moment.",
    beltRequired: "white",
    xpRequired: 100,
    parents: [],
    tags: ["presence", "awareness", "readiness"],
    icon: "👁️",
    maxLevel: 5,
  },
  // Yellow Belt
  {
    id: "samurai_decisive_cut",
    philosophy: "samurai",
    name: "Decisive Cut",
    description: "Act without hesitation when the moment demands.",
    beltRequired: "yellow",
    xpRequired: 500,
    parents: ["samurai_presence"],
    tags: ["decision", "action", "speed"],
    icon: "⚔️",
    maxLevel: 10,
  },
  {
    id: "samurai_facing_fear",
    philosophy: "samurai",
    name: "Facing Fear",
    description: "Move toward what frightens you with calm determination.",
    beltRequired: "yellow",
    xpRequired: 600,
    parents: ["samurai_honor"],
    tags: ["fear", "courage", "confrontation"],
    icon: "🔥",
    maxLevel: 5,
  },
  // Orange Belt
  {
    id: "samurai_already_dead",
    philosophy: "samurai",
    name: "Already Dead",
    description: "Live as if you have already died—free from fear of death.",
    beltRequired: "orange",
    xpRequired: 1500,
    parents: ["samurai_facing_fear"],
    tags: ["death", "freedom", "fearlessness"],
    icon: "💀",
    maxLevel: 5,
  },
  {
    id: "samurai_ruthless_focus",
    philosophy: "samurai",
    name: "Ruthless Focus",
    description: "Eliminate all that does not serve the objective.",
    beltRequired: "orange",
    xpRequired: 2000,
    parents: ["samurai_decisive_cut"],
    tags: ["focus", "elimination", "priority"],
    icon: "🎯",
    maxLevel: 10,
  },
  // Green Belt
  {
    id: "samurai_two_swords",
    philosophy: "samurai",
    name: "Way of Two Swords",
    description: "Master multiple approaches simultaneously.",
    beltRequired: "green",
    xpRequired: 3500,
    parents: ["samurai_ruthless_focus", "samurai_already_dead"],
    tags: ["mastery", "versatility", "skill"],
    icon: "⚔️⚔️",
    maxLevel: 5,
  },
  // Blue Belt
  {
    id: "samurai_void",
    philosophy: "samurai",
    name: "The Void",
    description: "Act from emptiness—beyond technique into pure response.",
    beltRequired: "blue",
    xpRequired: 7000,
    parents: ["samurai_two_swords"],
    tags: ["void", "transcendence", "mastery"],
    icon: "🌑",
    maxLevel: 5,
  },
];

// ============================================
// TAOISM SKILL TREE
// ============================================

const TAOIST_SKILLS: SkillNode[] = [
  // White Belt
  {
    id: "taoist_water",
    philosophy: "taoism",
    name: "Way of Water",
    description: "Learn to flow around obstacles rather than fighting them.",
    beltRequired: "white",
    xpRequired: 0,
    parents: [],
    tags: ["water", "flow", "adaptation"],
    icon: "💧",
    maxLevel: 5,
  },
  {
    id: "taoist_stillness",
    philosophy: "taoism",
    name: "Stillness in Motion",
    description: "Find the calm center even in activity.",
    beltRequired: "white",
    xpRequired: 100,
    parents: [],
    tags: ["stillness", "calm", "center"],
    icon: "🌊",
    maxLevel: 5,
  },
  // Yellow Belt
  {
    id: "taoist_yielding",
    philosophy: "taoism",
    name: "Power of Yielding",
    description: "The soft overcomes the hard through patient persistence.",
    beltRequired: "yellow",
    xpRequired: 500,
    parents: ["taoist_water"],
    tags: ["yielding", "patience", "softness"],
    icon: "🌿",
    maxLevel: 5,
  },
  {
    id: "taoist_wu_wei",
    philosophy: "taoism",
    name: "Wu Wei",
    description: "Effortless action—doing by not forcing.",
    beltRequired: "yellow",
    xpRequired: 600,
    parents: ["taoist_stillness"],
    tags: ["wu_wei", "effortless", "natural"],
    icon: "☯️",
    maxLevel: 10,
  },
  // Orange Belt
  {
    id: "taoist_empty_cup",
    philosophy: "taoism",
    name: "Empty Cup",
    description: "Release what you think you know to learn what you don't.",
    beltRequired: "orange",
    xpRequired: 1500,
    parents: ["taoist_wu_wei"],
    tags: ["emptiness", "learning", "humility"],
    icon: "🍵",
    maxLevel: 5,
  },
  {
    id: "taoist_natural_way",
    philosophy: "taoism",
    name: "Return to Nature",
    description: "Align your actions with the natural order of things.",
    beltRequired: "orange",
    xpRequired: 2000,
    parents: ["taoist_yielding", "taoist_wu_wei"],
    tags: ["nature", "alignment", "tao"],
    icon: "🌳",
    maxLevel: 5,
  },
  // Green Belt
  {
    id: "taoist_sage",
    philosophy: "taoism",
    name: "Way of the Sage",
    description: "Lead without appearing to lead. Serve without claiming credit.",
    beltRequired: "green",
    xpRequired: 3500,
    parents: ["taoist_empty_cup", "taoist_natural_way"],
    tags: ["wisdom", "leadership", "humility"],
    icon: "🧙",
    maxLevel: 5,
  },
];

// ============================================
// DISCIPLINE SKILL TREE
// ============================================

const DISCIPLINE_SKILLS: SkillNode[] = [
  // White Belt
  {
    id: "discipline_morning",
    philosophy: "discipline",
    name: "Morning Discipline",
    description: "Win the day by conquering the first hour.",
    beltRequired: "white",
    xpRequired: 0,
    parents: [],
    tags: ["morning", "routine", "start"],
    icon: "🌅",
    maxLevel: 5,
  },
  {
    id: "discipline_no_excuses",
    philosophy: "discipline",
    name: "No Excuses",
    description: "Eliminate the mental habit of excuse-making.",
    beltRequired: "white",
    xpRequired: 100,
    parents: [],
    tags: ["excuses", "accountability", "ownership"],
    icon: "🚫",
    maxLevel: 5,
  },
  // Yellow Belt
  {
    id: "discipline_embrace_suck",
    philosophy: "discipline",
    name: "Embrace the Suck",
    description: "Lean into discomfort as the path to growth.",
    beltRequired: "yellow",
    xpRequired: 500,
    parents: ["discipline_no_excuses"],
    tags: ["discomfort", "growth", "suffering"],
    icon: "💪",
    maxLevel: 10,
  },
  {
    id: "discipline_default_aggressive",
    philosophy: "discipline",
    name: "Default Aggressive",
    description: "When in doubt, move forward and attack problems.",
    beltRequired: "yellow",
    xpRequired: 600,
    parents: ["discipline_morning"],
    tags: ["action", "aggression", "initiative"],
    icon: "⚡",
    maxLevel: 5,
  },
  // Orange Belt
  {
    id: "discipline_40_percent",
    philosophy: "discipline",
    name: "40% Rule",
    description: "When you think you're done, you're only at 40%.",
    beltRequired: "orange",
    xpRequired: 1500,
    parents: ["discipline_embrace_suck"],
    tags: ["endurance", "limits", "capacity"],
    icon: "📊",
    maxLevel: 5,
  },
  {
    id: "discipline_extreme_ownership",
    philosophy: "discipline",
    name: "Extreme Ownership",
    description: "Take complete responsibility for everything in your world.",
    beltRequired: "orange",
    xpRequired: 2000,
    parents: ["discipline_no_excuses", "discipline_default_aggressive"],
    tags: ["ownership", "responsibility", "leadership"],
    icon: "👊",
    maxLevel: 10,
  },
  // Green Belt
  {
    id: "discipline_freedom",
    philosophy: "discipline",
    name: "Discipline Equals Freedom",
    description: "True freedom comes through self-imposed constraints.",
    beltRequired: "green",
    xpRequired: 3500,
    parents: ["discipline_40_percent", "discipline_extreme_ownership"],
    tags: ["freedom", "discipline", "mastery"],
    icon: "🦅",
    maxLevel: 5,
  },
];

// ============================================
// COMBINED EXPORTS
// ============================================

const ALL_SKILLS: SkillNode[] = [
  ...STOIC_SKILLS,
  ...SAMURAI_SKILLS,
  ...TAOIST_SKILLS,
  ...DISCIPLINE_SKILLS,
];

export function getSkillTree(philosophy: PhilosophyId): SkillNode[] {
  return ALL_SKILLS.filter(s => s.philosophy === philosophy);
}

export function getSkillById(id: string): SkillNode | undefined {
  return ALL_SKILLS.find(s => s.id === id);
}

export function getUnlockedSkills(
  philosophy: PhilosophyId,
  currentXp: number,
  belt: BeltRank
): SkillNode[] {
  const tree = getSkillTree(philosophy);
  const beltOrder: BeltRank[] = ["white", "yellow", "orange", "green", "blue", "brown", "black", "master"];
  const currentBeltIndex = beltOrder.indexOf(belt);

  return tree.filter(skill => {
    const skillBeltIndex = beltOrder.indexOf(skill.beltRequired);
    return skillBeltIndex <= currentBeltIndex && skill.xpRequired <= currentXp;
  });
}

export function getNextUnlockableSkills(
  philosophy: PhilosophyId,
  currentXp: number,
  belt: BeltRank
): SkillNode[] {
  const tree = getSkillTree(philosophy);
  const unlocked = getUnlockedSkills(philosophy, currentXp, belt);
  const unlockedIds = new Set(unlocked.map(s => s.id));

  return tree.filter(skill => {
    if (unlockedIds.has(skill.id)) return false;
    const parentsUnlocked = skill.parents.every(p => unlockedIds.has(p));
    return parentsUnlocked;
  });
}

export function calculateBeltFromXp(xp: number): BeltRank {
  const belts: BeltRank[] = ["master", "black", "brown", "blue", "green", "orange", "yellow", "white"];
  for (const belt of belts) {
    if (xp >= BELT_XP_THRESHOLDS[belt]) {
      return belt;
    }
  }
  return "white";
}

export { ALL_SKILLS, STOIC_SKILLS, SAMURAI_SKILLS, TAOIST_SKILLS, DISCIPLINE_SKILLS };
