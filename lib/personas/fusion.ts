// Persona Fusion Engine
// lib/personas/fusion.ts

import { FusionInput, FusionResult, ToneMatrix } from "./types";

/**
 * Fuse two personas with weighted blending
 */
export function fusePersonas(input: FusionInput): FusionResult {
  const { personaA, personaB, weightA, weightB } = input;

  // Normalize weights
  const totalWeight = weightA + weightB;
  const normalizedA = weightA / totalWeight;
  const normalizedB = weightB / totalWeight;

  // Fuse numeric values
  const fusedStyle: ToneMatrix = {
    energy: Math.round(personaA.style.energy * normalizedA + personaB.style.energy * normalizedB),
    warmth: Math.round(personaA.style.warmth * normalizedA + personaB.style.warmth * normalizedB),
    pacing: weightA > weightB ? personaA.style.pacing : personaB.style.pacing, // Use dominant pacing
    sentence_length: weightA > weightB ? personaA.style.sentence_length : personaB.style.sentence_length,
    decisiveness: Math.round(personaA.style.decisiveness * normalizedA + personaB.style.decisiveness * normalizedB),
    humor: Math.round(personaA.style.humor * normalizedA + personaB.style.humor * normalizedB),
    metaphor_density: Math.round((personaA.style.metaphor_density || 0) * normalizedA + (personaB.style.metaphor_density || 0) * normalizedB),
    rhetorical_intensity: Math.round((personaA.style.rhetorical_intensity || 0) * normalizedA + (personaB.style.rhetorical_intensity || 0) * normalizedB),
    directiveness: Math.round((personaA.style.directiveness || 0) * normalizedA + (personaB.style.directiveness || 0) * normalizedB),
    emotional_reflection: Math.round((personaA.style.emotional_reflection || 0) * normalizedA + (personaB.style.emotional_reflection || 0) * normalizedB),
    phrasing_patterns: fusePhrasingPatterns(
      personaA.style.phrasing_patterns,
      personaB.style.phrasing_patterns,
      normalizedA,
      normalizedB
    ),
  };

  // Clamp values to valid ranges
  const clampedStyle: ToneMatrix = {
    ...fusedStyle,
    energy: Math.max(0, Math.min(100, fusedStyle.energy)),
    warmth: Math.max(0, Math.min(100, fusedStyle.warmth)),
    decisiveness: Math.max(0, Math.min(100, fusedStyle.decisiveness)),
    humor: Math.max(0, Math.min(100, fusedStyle.humor)),
    metaphor_density: Math.max(0, Math.min(100, fusedStyle.metaphor_density || 0)),
    rhetorical_intensity: Math.max(0, Math.min(100, fusedStyle.rhetorical_intensity || 0)),
    directiveness: Math.max(0, Math.min(100, fusedStyle.directiveness || 0)),
    emotional_reflection: Math.max(0, Math.min(100, fusedStyle.emotional_reflection || 0)),
  };

  return {
    name: `${personaA.name}-${personaB.name} Hybrid`,
    style: clampedStyle,
    fusionWeights: { a: weightA, b: weightB },
  };
}

/**
 * Fuse phrasing patterns, weighted by fusion ratio
 */
function fusePhrasingPatterns(
  patternsA: string[],
  patternsB: string[],
  weightA: number,
  weightB: number
): string[] {
  const combined: string[] = [];
  const seen = new Set<string>();

  // Add patterns from A (weighted by dominance)
  const countA = Math.ceil(patternsA.length * weightA);
  for (let i = 0; i < countA && i < patternsA.length; i++) {
    if (!seen.has(patternsA[i])) {
      combined.push(patternsA[i]);
      seen.add(patternsA[i]);
    }
  }

  // Add patterns from B (weighted by dominance)
  const countB = Math.ceil(patternsB.length * weightB);
  for (let i = 0; i < countB && i < patternsB.length; i++) {
    if (!seen.has(patternsB[i])) {
      combined.push(patternsB[i]);
      seen.add(patternsB[i]);
    }
  }

  // Fill remaining slots with remaining patterns
  for (const pattern of patternsA) {
    if (combined.length >= 10) break; // Limit to 10 patterns
    if (!seen.has(pattern)) {
      combined.push(pattern);
      seen.add(pattern);
    }
  }

  for (const pattern of patternsB) {
    if (combined.length >= 10) break;
    if (!seen.has(pattern)) {
      combined.push(pattern);
      seen.add(pattern);
    }
  }

  return combined.slice(0, 10); // Max 10 patterns
}

/**
 * Validate fusion result
 */
export function validateFusion(style: ToneMatrix): boolean {
  return (
    style.energy >= 0 && style.energy <= 100 &&
    style.warmth >= 0 && style.warmth <= 100 &&
    style.decisiveness >= 0 && style.decisiveness <= 100 &&
    style.humor >= 0 && style.humor <= 100 &&
    (style.metaphor_density === undefined || (style.metaphor_density >= 0 && style.metaphor_density <= 100)) &&
    (style.rhetorical_intensity === undefined || (style.rhetorical_intensity >= 0 && style.rhetorical_intensity <= 100)) &&
    (style.directiveness === undefined || (style.directiveness >= 0 && style.directiveness <= 100)) &&
    (style.emotional_reflection === undefined || (style.emotional_reflection >= 0 && style.emotional_reflection <= 100)) &&
    ["fast", "normal", "slow"].includes(style.pacing) &&
    ["short", "medium", "long"].includes(style.sentence_length) &&
    Array.isArray(style.phrasing_patterns)
  );
}

