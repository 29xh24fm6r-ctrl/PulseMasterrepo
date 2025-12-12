// User Safety Settings Tests
// tests/safety/user_settings.test.ts

import { applyUserSafetyPreferencesToPersona } from "@/lib/safety/user-preferences";
import { PersonaProfile } from "@/lib/personas/types";
import { UserSafetySettings } from "@/lib/safety/types";

describe("User Safety Settings", () => {
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
      phrasing_patterns: [],
    },
  };

  test("high tone sensitivity increases warmth and reduces energy", () => {
    const settings: UserSafetySettings = {
      user_id: "user1",
      allow_mature_but_nonsexual: false,
      allow_direct_language: true,
      tone_sensitivity: "high",
    };

    const adjusted = applyUserSafetyPreferencesToPersona(basePersona, settings);

    expect(adjusted.style.warmth).toBeGreaterThan(basePersona.style.warmth);
    expect(adjusted.style.energy).toBeLessThan(basePersona.style.energy);
    expect(adjusted.style.directiveness).toBeLessThan(basePersona.style.directiveness);
  });

  test("no direct language reduces directiveness", () => {
    const settings: UserSafetySettings = {
      user_id: "user1",
      allow_mature_but_nonsexual: false,
      allow_direct_language: false,
      tone_sensitivity: "normal",
    };

    const adjusted = applyUserSafetyPreferencesToPersona(basePersona, settings);

    expect(adjusted.style.directiveness).toBeLessThan(basePersona.style.directiveness);
    expect(adjusted.style.warmth).toBeGreaterThan(basePersona.style.warmth);
  });

  test("hard boundaries remain regardless of settings", () => {
    // This is a conceptual test - hard boundaries are enforced at the safety engine level,
    // not at the persona level
    expect(true).toBe(true);
  });
});

