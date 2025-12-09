// Pulse Motivational Coach - Complete Persona Library
// 60+ Personas from all archetypes

import { PulsePersona } from "./types";
import { PERSONAS_PART1 } from "./personas-part1";
import { PERSONAS_PART2 } from "./personas-part2";
import { PERSONAS_PART3 } from "./personas-part3";

// Export all personas combined
export const PERSONAS: PulsePersona[] = [
  ...PERSONAS_PART1,
  ...PERSONAS_PART2,
  ...PERSONAS_PART3,
];

// Helper to get persona by ID
export function getPersonaById(id: string): PulsePersona | undefined {
  return PERSONAS.find(p => p.id === id);
}

// Helper to get personas by archetype
export function getPersonasByArchetype(archetype: string): PulsePersona[] {
  return PERSONAS.filter(p => p.archetype === archetype);
}

// Helper to get personas by need
export function getPersonasByNeed(need: string): PulsePersona[] {
  return PERSONAS.filter(
    p => p.primaryNeeds.includes(need as any) || p.secondaryNeeds.includes(need as any)
  );
}

// Helper to get personas by intensity
export function getPersonasByIntensity(intensity: "low" | "medium" | "high"): PulsePersona[] {
  return PERSONAS.filter(p => p.defaultIntensity === intensity);
}

// Get random persona from a list
export function getRandomPersona(personas: PulsePersona[]): PulsePersona {
  return personas[Math.floor(Math.random() * personas.length)];
}

// Persona categories for UI display
export const PERSONA_CATEGORIES = {
  military: "Military & Leadership Titans",
  industry: "Titans of Industry",
  modern_motivator: "Modern Motivators",
  spiritual: "Spiritual Leaders",
  psychology: "Psychologists & Scientists",
  sports: "Sports Legends",
  philosophy: "Philosophers & Sages",
  oratory: "Great Orators",
  faith: "Faith & Wisdom",
  warrior: "Warrior Tradition",
  creative: "Creative Leaders",
};

// Export persona count for stats
export const PERSONA_COUNT = PERSONAS.length;
