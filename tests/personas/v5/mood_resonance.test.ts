// Mood Resonance Tests
// tests/personas/v5/mood_resonance.test.ts

import { getMoodResonanceTuning } from "@/lib/personas/mood_resonance";

describe("Mood Resonance", () => {
  test("high-intensity negative emotion increases warmth and emotional reflection", () => {
    const tuning = getMoodResonanceTuning({
      emotionLabel: "stressed",
      intensity: 0.8,
      bondLevel: "acquaintance",
    });
    expect(tuning.warmthDelta).toBeGreaterThan(0);
    expect(tuning.emotionalReflectionDelta).toBeGreaterThan(0);
    expect(tuning.directivenessDelta).toBeLessThan(0);
  });

  test("energized state doesn't flatten energy", () => {
    const tuning = getMoodResonanceTuning({
      emotionLabel: "excited",
      intensity: 0.7,
      bondLevel: "trusted",
    });
    expect(tuning.energyDelta).toBeGreaterThanOrEqual(0);
  });
});




