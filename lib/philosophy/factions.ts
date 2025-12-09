// Philosophy Factions - Communities & Perks

import { FactionProfile, FactionId } from "./types";

export const FACTIONS: FactionProfile[] = [
  {
    id: "stoic_order",
    name: "The Stoic Order",
    motto: "Unmoved by chaos.",
    philosophy: "stoicism",
    description: "Calm, disciplined, reflective practitioners of steady courage. We face adversity with reason and accept what we cannot change while changing what we can.",
    perks: [
      "+10% IXP on emotional regulation drills",
      "Special Stoic Boss Fights unlocked earlier",
      "Access to exclusive Marcus Aurelius mentor sessions",
      "Daily Stoic reflections in morning brief",
    ],
    icon: "🏛️",
    color: "#6366f1",
  },
  {
    id: "samurai_brotherhood",
    name: "The Samurai Brotherhood",
    motto: "Face the cut.",
    philosophy: "samurai",
    description: "Warriors of decisive action and ruthless focus. We live as if already dead, cutting through hesitation with the clarity of a blade.",
    perks: [
      "+10% PXP on courage & conflict drills",
      "Access to 'Decisive Cut' challenges",
      "Musashi mentor sessions with advanced katas",
      "Honor tracking and bushido achievements",
    ],
    icon: "⚔️",
    color: "#dc2626",
  },
  {
    id: "taoist_garden",
    name: "The Taoist Garden",
    motto: "Flow, don't force.",
    philosophy: "taoism",
    description: "Cultivators of effortless action and natural harmony. We move like water, overcome through yielding, and find strength in softness.",
    perks: [
      "+10% IXP on patience & flow drills",
      "Wu Wei meditation challenges",
      "Lao Tzu wisdom sessions",
      "Nature-aligned training themes",
    ],
    icon: "☯️",
    color: "#059669",
  },
  {
    id: "zen_circle",
    name: "The Zen Circle",
    motto: "Just this.",
    philosophy: "zen",
    description: "Seekers of direct experience and present moment awareness. We sit with what is, without adding or subtracting, finding the infinite in the ordinary.",
    perks: [
      "+10% IXP on mindfulness drills",
      "Koan training sessions",
      "Zen Master mentor guidance",
      "Beginner's Mind achievement track",
    ],
    icon: "🧘",
    color: "#0891b2",
  },
  {
    id: "discipline_legion",
    name: "The Discipline Legion",
    motto: "Discipline equals freedom.",
    philosophy: "discipline",
    description: "Soldiers of self-mastery. We embrace discomfort, eliminate excuses, and build unshakeable foundations through daily disciplines.",
    perks: [
      "+10% MXP on discipline drills",
      "Early morning challenge unlocks",
      "Extreme ownership training",
      "Streak multiplier bonuses",
    ],
    icon: "💪",
    color: "#ea580c",
  },
  {
    id: "spartan_agoge",
    name: "The Spartan Agoge",
    motto: "With your shield, or on it.",
    philosophy: "spartan",
    description: "Forged in hardship, tempered by suffering. We seek discomfort as training, embrace frugality, and build strength that cannot be broken.",
    perks: [
      "+10% all XP on endurance challenges",
      "Hardship training missions",
      "Spartan brevity achievement track",
      "Unit-based team challenges",
    ],
    icon: "🛡️",
    color: "#991b1b",
  },
];

export function getFaction(id: FactionId): FactionProfile | undefined {
  return FACTIONS.find(f => f.id === id);
}

export function getFactionsByPhilosophy(philosophyId: string): FactionProfile[] {
  return FACTIONS.filter(f => f.philosophy === philosophyId || f.philosophy === "mixed");
}

export function getAllFactions(): FactionProfile[] {
  return FACTIONS;
}
