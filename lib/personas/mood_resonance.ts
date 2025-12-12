// Persona Mood Resonance Engine
// lib/personas/mood_resonance.ts

import { BondLevel } from "./companion";

export interface MoodTuning {
  energyDelta: number;
  warmthDelta: number;
  emotionalReflectionDelta: number;
  directivenessDelta: number;
}

/**
 * Get mood resonance tuning based on emotion and bond level
 */
export function getMoodResonanceTuning(params: {
  emotionLabel?: string;
  intensity?: number;
  bondLevel: BondLevel;
}): MoodTuning {
  const { emotionLabel, intensity = 0.5, bondLevel } = params;

  const tuning: MoodTuning = {
    energyDelta: 0,
    warmthDelta: 0,
    emotionalReflectionDelta: 0,
    directivenessDelta: 0,
  };

  // High stress patterns
  if (emotionLabel === "stressed" || emotionLabel === "anxious" || emotionLabel === "overwhelmed") {
    if (intensity > 0.7) {
      // High stress
      tuning.warmthDelta = 10;
      tuning.emotionalReflectionDelta = 15;
      tuning.directivenessDelta = -10;

      // Adjust based on bond level
      if (bondLevel === "trusted" || bondLevel === "deep") {
        // Trusted bonds can be slightly more directive after initial support
        tuning.directivenessDelta = -5;
      }
    } else {
      // Moderate stress
      tuning.warmthDelta = 5;
      tuning.emotionalReflectionDelta = 8;
      tuning.directivenessDelta = -5;
    }
  }

  // Low energy / flat patterns
  if (emotionLabel === "flat" || emotionLabel === "depressed" || emotionLabel === "tired") {
    if (bondLevel === "trusted" || bondLevel === "deep") {
      // Trusted bonds can gently raise energy
      tuning.energyDelta = 5;
      tuning.warmthDelta = 10;
      tuning.directivenessDelta = 3; // Gentle nudge
    } else {
      // Early bonds: more warmth, less directive
      tuning.warmthDelta = 8;
      tuning.energyDelta = 2;
      tuning.directivenessDelta = -3;
    }
  }

  // Excited / energized patterns
  if (emotionLabel === "excited" || emotionLabel === "energized" || emotionLabel === "happy") {
    // Mirror energy but don't overdo
    tuning.energyDelta = Math.min(8, intensity * 10);
    tuning.warmthDelta = 5;
    tuning.directivenessDelta = 2; // Can be slightly more directive when user is energized
  }

  // Sad / grief patterns
  if (emotionLabel === "sad" || emotionLabel === "grief" || emotionLabel === "mourning") {
    tuning.warmthDelta = 15;
    tuning.emotionalReflectionDelta = 20;
    tuning.energyDelta = -10;
    tuning.directivenessDelta = -15; // Very low directiveness during grief
  }

  // Angry / frustrated patterns
  if (emotionLabel === "angry" || emotionLabel === "frustrated") {
    tuning.warmthDelta = 8;
    tuning.emotionalReflectionDelta = 10;
    tuning.directivenessDelta = -8;
    tuning.energyDelta = -5; // Don't match anger energy
  }

  // Clamp deltas to reasonable ranges
  tuning.energyDelta = Math.max(-15, Math.min(15, tuning.energyDelta));
  tuning.warmthDelta = Math.max(-10, Math.min(20, tuning.warmthDelta));
  tuning.emotionalReflectionDelta = Math.max(-10, Math.min(25, tuning.emotionalReflectionDelta));
  tuning.directivenessDelta = Math.max(-15, Math.min(10, tuning.directivenessDelta));

  return tuning;
}




