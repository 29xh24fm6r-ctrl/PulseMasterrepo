// Persona DNA Tests
// tests/personas/v3/dna.test.ts

import { encodePersonaToDNA, decodeDNAToPersona, mutateDNA, recombineDNA } from "@/lib/personas/dna";
import { PersonaProfile } from "@/lib/personas/types";

describe("Persona DNA", () => {
  const basePersona: PersonaProfile = {
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
      phrasing_patterns: ["Let's go"],
    },
  };

  test("encode/decode is stable and idempotent", () => {
    const dna = encodePersonaToDNA(basePersona);
    const decoded = decodeDNAToPersona(dna, basePersona);

    expect(decoded.style.energy).toBe(basePersona.style.energy);
    expect(decoded.style.warmth).toBe(basePersona.style.warmth);
    expect(decoded.style.pacing).toBe(basePersona.style.pacing);
  });

  test("mutations respect intensity and bounds", () => {
    const dna = encodePersonaToDNA(basePersona);
    const mutated = mutateDNA(dna, { intensity: 5 });

    // Values should be within ±5 of original
    expect(Math.abs(mutated.genes.tone.energy - dna.genes.tone.energy)).toBeLessThanOrEqual(5);
    expect(mutated.genes.tone.energy).toBeGreaterThanOrEqual(0);
    expect(mutated.genes.tone.energy).toBeLessThanOrEqual(100);
  });

  test("recombination yields reasonable intermediate DNA", () => {
    const dnaA = encodePersonaToDNA(basePersona);
    
    const personaB: PersonaProfile = {
      ...basePersona,
      style: {
        ...basePersona.style,
        energy: 30,
        warmth: 95,
      },
    };
    const dnaB = encodePersonaToDNA(personaB);

    const recombined = recombineDNA(dnaA, dnaB, { ratioA: 50, ratioB: 50 });

    // Recombined energy should be between 30 and 90
    expect(recombined.genes.tone.energy).toBeGreaterThanOrEqual(30);
    expect(recombined.genes.tone.energy).toBeLessThanOrEqual(90);
    
    // Should be approximately the average
    expect(recombined.genes.tone.energy).toBeCloseTo(60, 0);
  });
});




