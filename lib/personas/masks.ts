// Roleplay Masks Engine
// lib/personas/masks.ts

import { supabaseAdmin } from "@/lib/supabase";
import { RoleplayMask, ToneMatrix } from "./types";

/**
 * Pre-seeded roleplay masks
 */
export const PREDEFINED_MASKS: Omit<RoleplayMask, "id">[] = [
  {
    name: "Angry Customer",
    description: "Frustrated customer with legitimate complaint",
    style: {
      energy: 75,
      warmth: 20,
      pacing: "fast",
      sentence_length: "short",
      decisiveness: 90,
      humor: 5,
      metaphor_density: 10,
      rhetorical_intensity: 80,
      directiveness: 95,
      emotional_reflection: 30,
      phrasing_patterns: [
        "This is unacceptable",
        "I demand",
        "This is ridiculous",
        "I've been waiting",
      ],
    },
    difficulty: 7,
    metadata: {
      emotional_anchors: ["frustration", "entitlement", "urgency"],
      reactivity_profile: { interruption: 0.8, escalation: 0.7 },
      conflict_patterns: ["blame", "demand", "threaten"],
      resolution_threshold: 0.6,
    },
  },
  {
    name: "Passive-Aggressive CoWorker",
    description: "Indirect communication with hidden hostility",
    style: {
      energy: 40,
      warmth: 30,
      pacing: "normal",
      sentence_length: "medium",
      decisiveness: 20,
      humor: 60,
      metaphor_density: 50,
      rhetorical_intensity: 40,
      directiveness: 10,
      emotional_reflection: 20,
      phrasing_patterns: [
        "I guess that's fine",
        "If you think so",
        "Whatever works for you",
        "No worries",
      ],
    },
    difficulty: 6,
    metadata: {
      emotional_anchors: ["resentment", "avoidance", "sarcasm"],
      reactivity_profile: { deflection: 0.9, passive_resistance: 0.8 },
      conflict_patterns: ["sarcasm", "deflection", "guilt_trip"],
      resolution_threshold: 0.4,
    },
  },
  {
    name: "High-Stakes Investor",
    description: "Serious, data-driven, time-sensitive",
    style: {
      energy: 60,
      warmth: 40,
      pacing: "normal",
      sentence_length: "medium",
      decisiveness: 95,
      humor: 10,
      metaphor_density: 20,
      rhetorical_intensity: 50,
      directiveness: 85,
      emotional_reflection: 30,
      phrasing_patterns: [
        "Show me the numbers",
        "What's the ROI",
        "Prove it",
        "Time is money",
      ],
    },
    difficulty: 8,
    metadata: {
      emotional_anchors: ["urgency", "skepticism", "value"],
      reactivity_profile: { data_demand: 0.9, time_pressure: 0.8 },
      conflict_patterns: ["challenge", "skepticism", "deadline"],
      resolution_threshold: 0.7,
    },
  },
  {
    name: "Executive VP",
    description: "Senior executive, strategic, decisive",
    style: {
      energy: 55,
      warmth: 50,
      pacing: "normal",
      sentence_length: "medium",
      decisiveness: 90,
      humor: 25,
      metaphor_density: 30,
      rhetorical_intensity: 60,
      directiveness: 80,
      emotional_reflection: 40,
      phrasing_patterns: [
        "Let's align on",
        "What's the strategy",
        "Make it happen",
        "Keep me posted",
      ],
    },
    difficulty: 7,
    metadata: {
      emotional_anchors: ["authority", "efficiency", "results"],
      reactivity_profile: { efficiency: 0.9, clarity: 0.8 },
      conflict_patterns: ["redirect", "challenge", "expectation"],
      resolution_threshold: 0.65,
    },
  },
  {
    name: "Warm Friend",
    description: "Supportive, understanding, encouraging",
    style: {
      energy: 60,
      warmth: 95,
      pacing: "normal",
      sentence_length: "medium",
      decisiveness: 40,
      humor: 70,
      metaphor_density: 40,
      rhetorical_intensity: 30,
      directiveness: 20,
      emotional_reflection: 90,
      phrasing_patterns: [
        "I totally get it",
        "You've got this",
        "That sounds tough",
        "I'm here for you",
      ],
    },
    difficulty: 3,
    metadata: {
      emotional_anchors: ["support", "empathy", "encouragement"],
      reactivity_profile: { validation: 0.9, support: 0.95 },
      conflict_patterns: [],
      resolution_threshold: 0.3,
    },
  },
  {
    name: "Hostile Negotiator",
    description: "Aggressive, competitive, win-lose mindset",
    style: {
      energy: 80,
      warmth: 15,
      pacing: "fast",
      sentence_length: "short",
      decisiveness: 95,
      humor: 20,
      metaphor_density: 30,
      rhetorical_intensity: 85,
      directiveness: 95,
      emotional_reflection: 20,
      phrasing_patterns: [
        "That's not acceptable",
        "Take it or leave it",
        "My final offer",
        "You're wasting my time",
      ],
    },
    difficulty: 9,
    metadata: {
      emotional_anchors: ["dominance", "competition", "urgency"],
      reactivity_profile: { escalation: 0.8, pressure: 0.9 },
      conflict_patterns: ["ultimatum", "pressure", "threat"],
      resolution_threshold: 0.8,
    },
  },
];

/**
 * Seed roleplay masks
 */
export async function seedRoleplayMasks(): Promise<void> {
  for (const mask of PREDEFINED_MASKS) {
    await supabaseAdmin
      .from("roleplay_masks")
      .upsert(
        {
          name: mask.name,
          description: mask.description,
          style: mask.style,
          difficulty: mask.difficulty,
          metadata: mask.metadata,
        },
        {
          onConflict: "name",
        }
      );
  }
}

/**
 * Get roleplay mask by name
 */
export async function getRoleplayMask(name: string): Promise<RoleplayMask | null> {
  const { data } = await supabaseAdmin
    .from("roleplay_masks")
    .select("*")
    .eq("name", name)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    style: data.style as ToneMatrix,
    difficulty: data.difficulty,
    metadata: data.metadata || {},
  };
}

/**
 * List all roleplay masks
 */
export async function listRoleplayMasks(): Promise<RoleplayMask[]> {
  const { data } = await supabaseAdmin
    .from("roleplay_masks")
    .select("*")
    .order("difficulty", { ascending: true });

  if (!data) return [];

  return data.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    style: m.style as ToneMatrix,
    difficulty: m.difficulty,
    metadata: m.metadata || {},
  }));
}




