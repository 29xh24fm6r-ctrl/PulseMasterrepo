// Persona Motion Engine
// lib/personas/motion.ts

import { supabaseAdmin } from "@/lib/supabase";
import { PersonaProfile, ToneMatrix } from "./types";

export interface MotionPhase {
  id: string;
  position: number; // 0-1, where in the response this phase starts
  length_ratio: number; // 0-1, what portion of response this phase covers
  tuning_delta: Partial<ToneMatrix>;
}

export interface MotionProfile {
  key: string;
  name: string;
  description: string;
  phases: MotionPhase[];
  metadata?: Record<string, any>;
}

export interface MotionSelectionParams {
  coachId: string;
  personaId: string;
  userEmotion?: {
    primary: string | null;
    intensity?: number;
  } | null;
  context?: {
    crisis?: boolean;
    pepTalk?: boolean;
    deepReflection?: boolean;
  };
}

/**
 * Pre-seeded motion profiles
 */
export const PREDEFINED_MOTION_PROFILES: MotionProfile[] = [
  {
    key: "gentle_arc",
    name: "Gentle Arc",
    description: "Soft start, rising clarity, warm landing",
    phases: [
      {
        id: "intro",
        position: 0,
        length_ratio: 0.2,
        tuning_delta: {
          energy: -10,
          warmth: 10,
          directiveness: -20,
          emotional_reflection: 15,
        },
      },
      {
        id: "build",
        position: 0.2,
        length_ratio: 0.3,
        tuning_delta: {
          energy: 5,
          directiveness: 10,
        },
      },
      {
        id: "peak",
        position: 0.5,
        length_ratio: 0.3,
        tuning_delta: {
          energy: 20,
          directiveness: 25,
          rhetorical_intensity: 20,
        },
      },
      {
        id: "landing",
        position: 0.8,
        length_ratio: 0.2,
        tuning_delta: {
          energy: -15,
          warmth: 10,
          emotional_reflection: 20,
        },
      },
    ],
  },
  {
    key: "hype_wave",
    name: "Hype Wave",
    description: "Rising energy, peak intensity, sustained momentum",
    phases: [
      {
        id: "warmup",
        position: 0,
        length_ratio: 0.15,
        tuning_delta: {
          energy: 10,
          warmth: 5,
        },
      },
      {
        id: "build",
        position: 0.15,
        length_ratio: 0.35,
        tuning_delta: {
          energy: 30,
          directiveness: 20,
          rhetorical_intensity: 25,
        },
      },
      {
        id: "peak",
        position: 0.5,
        length_ratio: 0.35,
        tuning_delta: {
          energy: 40,
          directiveness: 30,
          rhetorical_intensity: 35,
        },
      },
      {
        id: "sustain",
        position: 0.85,
        length_ratio: 0.15,
        tuning_delta: {
          energy: 25,
          directiveness: 15,
        },
      },
    ],
  },
  {
    key: "executive_snap",
    name: "Executive Snap",
    description: "Quick, decisive, to the point",
    phases: [
      {
        id: "opening",
        position: 0,
        length_ratio: 0.3,
        tuning_delta: {
          energy: 15,
          directiveness: 25,
          decisiveness: 20,
        },
      },
      {
        id: "core",
        position: 0.3,
        length_ratio: 0.5,
        tuning_delta: {
          energy: 20,
          directiveness: 30,
          decisiveness: 25,
        },
      },
      {
        id: "close",
        position: 0.8,
        length_ratio: 0.2,
        tuning_delta: {
          energy: 10,
          directiveness: 20,
        },
      },
    ],
  },
  {
    key: "deep_dive",
    name: "Deep Dive",
    description: "Slow build, sustained depth, reflective landing",
    phases: [
      {
        id: "entry",
        position: 0,
        length_ratio: 0.25,
        tuning_delta: {
          energy: -15,
          warmth: 15,
          pacing: "slow",
          emotional_reflection: 20,
        },
      },
      {
        id: "explore",
        position: 0.25,
        length_ratio: 0.5,
        tuning_delta: {
          energy: -5,
          metaphor_density: 20,
          rhetorical_intensity: 15,
        },
      },
      {
        id: "landing",
        position: 0.75,
        length_ratio: 0.25,
        tuning_delta: {
          energy: -20,
          warmth: 20,
          emotional_reflection: 25,
        },
      },
    ],
  },
  {
    key: "crisis_stabilize",
    name: "Crisis Stabilize",
    description: "High intensity start, gradual calm landing",
    phases: [
      {
        id: "alert",
        position: 0,
        length_ratio: 0.2,
        tuning_delta: {
          energy: 30,
          directiveness: 35,
          decisiveness: 30,
        },
      },
      {
        id: "action",
        position: 0.2,
        length_ratio: 0.4,
        tuning_delta: {
          energy: 20,
          directiveness: 25,
        },
      },
      {
        id: "calm",
        position: 0.6,
        length_ratio: 0.4,
        tuning_delta: {
          energy: -25,
          warmth: 25,
          emotional_reflection: 30,
          pacing: "slow",
        },
      },
    ],
  },
];

/**
 * Seed motion profiles
 */
export async function seedMotionProfiles(): Promise<void> {
  for (const profile of PREDEFINED_MOTION_PROFILES) {
    await supabaseAdmin
      .from("persona_motion_profiles")
      .upsert(
        {
          key: profile.key,
          name: profile.name,
          description: profile.description,
          phases: profile.phases,
          metadata: profile.metadata || {},
        },
        {
          onConflict: "key",
        }
      );
  }
}

/**
 * Select motion profile based on context
 */
export async function selectMotionProfile(
  params: MotionSelectionParams
): Promise<MotionProfile> {
  // Ensure profiles are seeded
  await seedMotionProfiles();

  // Check for coach-specific preferences
  const coachMotionMap: Record<string, string> = {
    confidant: "gentle_arc",
    sales: "hype_wave",
    motivational: "hype_wave",
    career: "executive_snap",
    philosophy: "deep_dive",
    emotional: "gentle_arc",
  };

  // Check context
  if (params.context?.crisis) {
    return PREDEFINED_MOTION_PROFILES.find((p) => p.key === "crisis_stabilize")!;
  }

  if (params.context?.pepTalk) {
    return PREDEFINED_MOTION_PROFILES.find((p) => p.key === "hype_wave")!;
  }

  if (params.context?.deepReflection) {
    return PREDEFINED_MOTION_PROFILES.find((p) => p.key === "deep_dive")!;
  }

  // Use coach default
  const defaultKey = coachMotionMap[params.coachId] || "gentle_arc";
  const profile = PREDEFINED_MOTION_PROFILES.find((p) => p.key === defaultKey);

  return profile || PREDEFINED_MOTION_PROFILES[0];
}

/**
 * Split text into phases based on motion profile
 */
export function splitTextIntoPhases(
  text: string,
  phases: MotionPhase[]
): string[] {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const totalSentences = sentences.length;

  const segments: string[] = [];
  let currentIndex = 0;

  for (const phase of phases) {
    const segmentLength = Math.ceil(totalSentences * phase.length_ratio);
    const segment = sentences
      .slice(currentIndex, currentIndex + segmentLength)
      .join(". ")
      .trim();

    if (segment) {
      segments.push(segment + ".");
    }

    currentIndex += segmentLength;
  }

  // Handle any remaining text
  if (currentIndex < sentences.length) {
    const remaining = sentences.slice(currentIndex).join(". ").trim();
    if (remaining) {
      segments[segments.length - 1] += " " + remaining + ".";
    }
  }

  return segments.filter((s) => s.length > 0);
}

/**
 * Apply motion to text segments
 */
export function applyMotionToSegments(
  segments: string[],
  basePersona: PersonaProfile,
  motionProfile: MotionProfile
): string[] {
  const transformed: string[] = [];

  for (let i = 0; i < segments.length && i < motionProfile.phases.length; i++) {
    const segment = segments[i];
    const phase = motionProfile.phases[i];

    // Create phase-adjusted persona
    const phasePersona: PersonaProfile = {
      ...basePersona,
      style: {
        ...basePersona.style,
        energy: Math.max(
          0,
          Math.min(100, basePersona.style.energy + (phase.tuning_delta.energy || 0))
        ),
        warmth: Math.max(
          0,
          Math.min(100, basePersona.style.warmth + (phase.tuning_delta.warmth || 0))
        ),
        directiveness: Math.max(
          0,
          Math.min(
            100,
            basePersona.style.directiveness + (phase.tuning_delta.directiveness || 0)
          )
        ),
        emotional_reflection: Math.max(
          0,
          Math.min(
            100,
            (basePersona.style.emotional_reflection || 0) +
              (phase.tuning_delta.emotional_reflection || 0)
          )
        ),
        rhetorical_intensity: Math.max(
          0,
          Math.min(
            100,
            (basePersona.style.rhetorical_intensity || 0) +
              (phase.tuning_delta.rhetorical_intensity || 0)
          )
        ),
        pacing: phase.tuning_delta.pacing || basePersona.style.pacing,
        sentence_length: phase.tuning_delta.sentence_length || basePersona.style.sentence_length,
      },
    };

    // Apply transformation (using existing transform logic)
    const { transformTextForVoice } = require("@/lib/voices/transform");
    const transformedSegment = transformTextForVoice({
      originalText: segment,
      voiceStyle: phasePersona.style,
    });

    transformed.push(transformedSegment);
  }

  // Add any remaining segments without transformation
  if (segments.length > transformed.length) {
    transformed.push(...segments.slice(transformed.length));
  }

  return transformed;
}




