// Persona Fusion Tests
// tests/personas/fusion.test.ts

import { fusePersonas, validateFusion } from "@/lib/personas/fusion";
import { PersonaProfile } from "@/lib/personas/types";

describe("Persona Fusion", () => {
  const personaA: PersonaProfile = {
    id: "1",
    key: "hype_warrior",
    name: "Hype Warrior",
    description: "Energetic",
    style: {
      energy: 90,
      warmth: 70,
      pacing: "fast",
      sentence_length: "short",
      decisiveness: 85,
      humor: 40,
      metaphor_density: 30,
      rhetorical_intensity: 70,
      directiveness: 90,
      emotional_reflection: 40,
      phrasing_patterns: ["Let's go", "Crush it"],
    },
  };

  const personaB: PersonaProfile = {
    id: "2",
    key: "zen_therapist",
    name: "Zen Therapist",
    description: "Calm",
    style: {
      energy: 30,
      warmth: 95,
      pacing: "slow",
      sentence_length: "long",
      decisiveness: 40,
      humor: 20,
      metaphor_density: 50,
      rhetorical_intensity: 30,
      directiveness: 20,
      emotional_reflection: 95,
      phrasing_patterns: ["Breathe with me", "I understand"],
    },
  };

  test("fuses personas with equal weights", () => {
    const result = fusePersonas({
      personaA,
      personaB,
      weightA: 50,
      weightB: 50,
    });

    expect(result.style.energy).toBeCloseTo(60, 0); // (90 + 30) / 2
    expect(result.style.warmth).toBeCloseTo(82.5, 0); // (70 + 95) / 2
    expect(validateFusion(result.style)).toBe(true);
  });

  test("fuses personas with weighted blend", () => {
    const result = fusePersonas({
      personaA,
      personaB,
      weightA: 70,
      weightB: 30,
    });

    expect(result.style.energy).toBeCloseTo(72, 0); // 90 * 0.7 + 30 * 0.3
    expect(result.style.warmth).toBeCloseTo(77.5, 0); // 70 * 0.7 + 95 * 0.3
    expect(validateFusion(result.style)).toBe(true);
  });

  test("merges phrasing patterns", () => {
    const result = fusePersonas({
      personaA,
      personaB,
      weightA: 50,
      weightB: 50,
    });

    expect(result.style.phrasing_patterns.length).toBeGreaterThan(0);
    expect(result.style.phrasing_patterns.length).toBeLessThanOrEqual(10);
  });

  test("validates fusion result", () => {
    const result = fusePersonas({
      personaA,
      personaB,
      weightA: 50,
      weightB: 50,
    });

    expect(validateFusion(result.style)).toBe(true);
    expect(result.style.energy).toBeGreaterThanOrEqual(0);
    expect(result.style.energy).toBeLessThanOrEqual(100);
  });
});




