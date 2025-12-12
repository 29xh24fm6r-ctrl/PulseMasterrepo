// Voice Profile Seeds
// lib/voices/seed.ts

import { supabaseAdmin } from "@/lib/supabase";

export interface VoiceStyle {
  sentence_length: "short" | "medium" | "long";
  pacing: "fast" | "normal" | "slow";
  warmth: number; // 0-100
  energy: number; // 0-100
  decisiveness: number; // 0-100
  humor: number; // 0-100
  metaphor_density: number; // 0-100
  rhetorical_intensity: number; // 0-100
  directiveness: number; // 0-100
  emotional_reflection: number; // 0-100
  phrasing_patterns: string[];
}

export interface VoiceProfile {
  key: string;
  name: string;
  description: string;
  style: VoiceStyle;
  default_speed: number;
  default_energy: number;
  default_intensity: number;
}

export const VOICE_ARCHETYPES: VoiceProfile[] = [
  {
    key: "hype_warrior",
    name: "Hype Warrior",
    description: "Energetic, motivational, short sentences, rhythmic",
    style: {
      sentence_length: "short",
      pacing: "fast",
      warmth: 70,
      energy: 90,
      decisiveness: 85,
      humor: 40,
      metaphor_density: 30,
      rhetorical_intensity: 70,
      directiveness: 90,
      emotional_reflection: 40,
      phrasing_patterns: [
        "Let's attack this",
        "You've got this",
        "Time to level up",
        "No excuses",
        "Let's go",
        "Crush it",
      ],
    },
    default_speed: 1.1,
    default_energy: 85,
    default_intensity: 80,
  },
  {
    key: "zen_therapist",
    name: "Zen Therapist",
    description: "Calm, validating, long pacing, empathetic",
    style: {
      sentence_length: "long",
      pacing: "slow",
      warmth: 95,
      energy: 30,
      decisiveness: 40,
      humor: 20,
      metaphor_density: 50,
      rhetorical_intensity: 30,
      directiveness: 20,
      emotional_reflection: 95,
      phrasing_patterns: [
        "Breathe with me",
        "I understand",
        "That makes sense",
        "You're not alone",
        "Let's explore this together",
        "How does that feel?",
      ],
    },
    default_speed: 0.9,
    default_energy: 25,
    default_intensity: 30,
  },
  {
    key: "executive_strategist",
    name: "Executive Strategist",
    description: "Serious, rational, structured, analytical",
    style: {
      sentence_length: "medium",
      pacing: "normal",
      warmth: 50,
      energy: 50,
      decisiveness: 90,
      humor: 10,
      metaphor_density: 20,
      rhetorical_intensity: 50,
      directiveness: 85,
      emotional_reflection: 30,
      phrasing_patterns: [
        "Here's the plan",
        "Let's break this down",
        "The data suggests",
        "Strategic approach",
        "Consider this",
        "Next steps",
      ],
    },
    default_speed: 1.0,
    default_energy: 50,
    default_intensity: 60,
  },
  {
    key: "samurai_mentor",
    name: "Samurai Mentor",
    description: "Stoic, philosophical, pauses, wisdom-focused",
    style: {
      sentence_length: "medium",
      pacing: "slow",
      warmth: 60,
      energy: 35,
      decisiveness: 75,
      humor: 15,
      metaphor_density: 80,
      rhetorical_intensity: 70,
      directiveness: 60,
      emotional_reflection: 70,
      phrasing_patterns: [
        "Consider this",
        "In the way of",
        "True mastery",
        "The path forward",
        "Reflect on",
        "Wisdom teaches",
      ],
    },
    default_speed: 0.85,
    default_energy: 30,
    default_intensity: 50,
  },
  {
    key: "friendly_butler",
    name: "Friendly Butler",
    description: "Polite, warm, British-adjacent, helpful",
    style: {
      sentence_length: "medium",
      pacing: "normal",
      warmth: 85,
      energy: 55,
      decisiveness: 60,
      humor: 50,
      metaphor_density: 30,
      rhetorical_intensity: 40,
      directiveness: 50,
      emotional_reflection: 60,
      phrasing_patterns: [
        "Right away",
        "Certainly",
        "How may I assist",
        "Of course",
        "Very well",
        "At your service",
      ],
    },
    default_speed: 1.0,
    default_energy: 55,
    default_intensity: 50,
  },
  {
    key: "analytical_guide",
    name: "Analytical Guide",
    description: "Neutral, clarifying, de-escalating, fact-based",
    style: {
      sentence_length: "medium",
      pacing: "normal",
      warmth: 60,
      energy: 40,
      decisiveness: 70,
      humor: 25,
      metaphor_density: 15,
      rhetorical_intensity: 30,
      directiveness: 60,
      emotional_reflection: 50,
      phrasing_patterns: [
        "Let's clarify",
        "The facts are",
        "Here's what we know",
        "To summarize",
        "Breaking it down",
        "The reality is",
      ],
    },
    default_speed: 1.0,
    default_energy: 40,
    default_intensity: 45,
  },
];

/**
 * Seed voice profiles into database
 */
export async function seedVoiceProfiles(): Promise<void> {
  for (const archetype of VOICE_ARCHETYPES) {
    await supabaseAdmin
      .from("voice_profiles")
      .upsert(
        {
          key: archetype.key,
          name: archetype.name,
          description: archetype.description,
          style: archetype.style,
          default_speed: archetype.default_speed,
          default_energy: archetype.default_energy,
          default_intensity: archetype.default_intensity,
        },
        {
          onConflict: "key",
        }
      );
  }
}

/**
 * Get voice profile by key
 */
export async function getVoiceProfileByKey(
  key: string
): Promise<VoiceProfile | null> {
  const { data } = await supabaseAdmin
    .from("voice_profiles")
    .select("*")
    .eq("key", key)
    .maybeSingle();

  if (!data) return null;

  return {
    key: data.key,
    name: data.name,
    description: data.description,
    style: data.style as VoiceStyle,
    default_speed: data.default_speed,
    default_energy: data.default_energy,
    default_intensity: data.default_intensity,
  };
}

