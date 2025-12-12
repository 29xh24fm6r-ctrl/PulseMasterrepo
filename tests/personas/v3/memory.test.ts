// Persona Memory Tests
// tests/personas/v3/memory.test.ts

import { applyUserStateToPersona } from "@/lib/personas/memory";
import { PersonaProfile, PersonaUserState } from "@/lib/personas/types";

describe("Persona Memory", () => {
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
      phrasing_patterns: ["Let's go"],
    },
  };

  test("applies user state deltas correctly", () => {
    const userState: PersonaUserState = {
      id: "1",
      user_id: "user1",
      persona_id: "1",
      coach_id: null,
      usage_count: 10,
      last_used_at: new Date().toISOString(),
      avg_energy_delta: 5,
      avg_warmth_delta: -10,
      avg_directiveness_delta: 0,
      preferred_pacing: null,
      preferred_sentence_length: null,
      preferred_stage: null,
      rejection_count: 0,
      approval_count: 5,
      notes: {},
      personality_bias: {},
    };

    const adjusted = applyUserStateToPersona(basePersona, userState);

    expect(adjusted.style.energy).toBe(95); // 90 + 5
    expect(adjusted.style.warmth).toBe(60); // 70 - 10
    expect(adjusted.style.decisiveness).toBe(85); // unchanged
  });

  test("applies preferred pacing override", () => {
    const userState: PersonaUserState = {
      id: "1",
      user_id: "user1",
      persona_id: "1",
      coach_id: null,
      usage_count: 10,
      last_used_at: new Date().toISOString(),
      avg_energy_delta: 0,
      avg_warmth_delta: 0,
      avg_directiveness_delta: 0,
      preferred_pacing: "slow",
      preferred_sentence_length: "long",
      preferred_stage: null,
      rejection_count: 0,
      approval_count: 0,
      notes: {},
      personality_bias: {},
    };

    const adjusted = applyUserStateToPersona(basePersona, userState);

    expect(adjusted.style.pacing).toBe("slow");
    expect(adjusted.style.sentence_length).toBe("long");
  });

  test("clamps deltas within bounds", () => {
    const userState: PersonaUserState = {
      id: "1",
      user_id: "user1",
      persona_id: "1",
      coach_id: null,
      usage_count: 10,
      last_used_at: new Date().toISOString(),
      avg_energy_delta: 50, // Would push energy to 140, should clamp to 100
      avg_warmth_delta: -100, // Would push warmth to -30, should clamp to 0
      avg_directiveness_delta: 0,
      preferred_pacing: null,
      preferred_sentence_length: null,
      preferred_stage: null,
      rejection_count: 0,
      approval_count: 0,
      notes: {},
      personality_bias: {},
    };

    const adjusted = applyUserStateToPersona(basePersona, userState);

    expect(adjusted.style.energy).toBe(100); // Clamped
    expect(adjusted.style.warmth).toBe(0); // Clamped
  });
});




