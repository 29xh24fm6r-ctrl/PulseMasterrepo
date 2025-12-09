// Philosophy Paths - Core Definitions

import { PhilosophyPath, PhilosophyId } from "./types";

export const PHILOSOPHY_PATHS: PhilosophyPath[] = [
  {
    id: "stoicism",
    name: "Stoicism",
    description: "Master your emotions, focus on what you control, and face adversity with calm courage.",
    icon: "🏛️",
    color: "#6366f1",
    defaultFaction: "stoic_order",
    coreVirtues: ["wisdom", "courage", "justice", "temperance"],
    keyPrinciples: [
      "Focus on what you can control",
      "Accept what you cannot change",
      "View obstacles as opportunities",
      "Practice negative visualization",
      "Live according to nature and reason",
    ],
  },
  {
    id: "samurai",
    name: "Way of the Samurai",
    description: "Embrace bushido: honor, decisive action, and mastery through relentless discipline.",
    icon: "⚔️",
    color: "#dc2626",
    defaultFaction: "samurai_brotherhood",
    coreVirtues: ["honor", "courage", "loyalty", "discipline"],
    keyPrinciples: [
      "Live as if already dead",
      "Cut through hesitation with decisive action",
      "Honor above outcome",
      "Master the sword, master the self",
      "Loyalty to purpose and principle",
    ],
  },
  {
    id: "taoism",
    name: "Taoism",
    description: "Flow with life's natural currents. Softness overcomes hardness, stillness conquers chaos.",
    icon: "☯️",
    color: "#059669",
    defaultFaction: "taoist_garden",
    coreVirtues: ["flow", "humility", "simplicity", "patience"],
    keyPrinciples: [
      "Wu wei - effortless action",
      "The soft overcomes the hard",
      "Be like water",
      "Empty yourself to be filled",
      "Align with the natural way",
    ],
  },
  {
    id: "zen",
    name: "Zen",
    description: "Direct experience beyond words. Present moment awareness. Beginner's mind always.",
    icon: "🧘",
    color: "#0891b2",
    defaultFaction: "zen_circle",
    coreVirtues: ["presence", "emptiness", "directness", "simplicity"],
    keyPrinciples: [
      "Be here now",
      "Beginner's mind",
      "Direct experience over concepts",
      "Sitting quietly, doing nothing",
      "Every moment is the moment",
    ],
  },
  {
    id: "seven_habits",
    name: "7 Habits Path",
    description: "Covey's principles of effectiveness: proactivity, vision, priorities, and synergy.",
    icon: "📘",
    color: "#7c3aed",
    defaultFaction: "discipline_legion",
    coreVirtues: ["proactivity", "vision", "priorities", "empathy"],
    keyPrinciples: [
      "Be proactive - response-ability",
      "Begin with the end in mind",
      "Put first things first",
      "Think win-win",
      "Seek first to understand",
      "Synergize",
      "Sharpen the saw",
    ],
  },
  {
    id: "discipline",
    name: "Discipline Path",
    description: "Raw discipline as freedom. Embrace the grind. No excuses, only solutions.",
    icon: "💪",
    color: "#ea580c",
    defaultFaction: "discipline_legion",
    coreVirtues: ["discipline", "consistency", "resilience", "accountability"],
    keyPrinciples: [
      "Discipline equals freedom",
      "Embrace the suck",
      "No excuses",
      "Get after it",
      "Default aggressive",
    ],
  },
  {
    id: "spartan",
    name: "Spartan Way",
    description: "Forge yourself through hardship. Comfort is the enemy. Strength through suffering.",
    icon: "🛡️",
    color: "#991b1b",
    defaultFaction: "spartan_agoge",
    coreVirtues: ["strength", "endurance", "frugality", "courage"],
    keyPrinciples: [
      "Comfort breeds weakness",
      "Train harder than you fight",
      "With your shield or on it",
      "Brevity of speech, power of action",
      "The unit above the individual",
    ],
  },
  {
    id: "buddhism",
    name: "Buddhist Path",
    description: "End suffering through understanding. The middle way. Compassion for all beings.",
    icon: "☸️",
    color: "#d97706",
    defaultFaction: "zen_circle",
    coreVirtues: ["compassion", "wisdom", "mindfulness", "equanimity"],
    keyPrinciples: [
      "Suffering comes from attachment",
      "The middle way",
      "Right action, right speech, right thought",
      "Impermanence of all things",
      "Compassion for all beings",
    ],
  },
];

export function getPhilosophyPath(id: PhilosophyId): PhilosophyPath | undefined {
  return PHILOSOPHY_PATHS.find(p => p.id === id);
}

export function getAllPhilosophyPaths(): PhilosophyPath[] {
  return PHILOSOPHY_PATHS;
}
