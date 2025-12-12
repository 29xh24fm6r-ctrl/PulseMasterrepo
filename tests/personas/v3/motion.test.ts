// Persona Motion Tests
// tests/personas/v3/motion.test.ts

import { splitTextIntoPhases, PREDEFINED_MOTION_PROFILES } from "@/lib/personas/motion";

describe("Persona Motion", () => {
  test("splits text into correct number of phases", () => {
    const text = "This is sentence one. This is sentence two. This is sentence three. This is sentence four. This is sentence five.";
    const profile = PREDEFINED_MOTION_PROFILES.find((p) => p.key === "gentle_arc")!;

    const segments = splitTextIntoPhases(text, profile.phases);

    expect(segments.length).toBeGreaterThan(0);
    expect(segments.length).toBeLessThanOrEqual(profile.phases.length);
  });

  test("crisis_stabilize has final low-energy landing", () => {
    const profile = PREDEFINED_MOTION_PROFILES.find((p) => p.key === "crisis_stabilize")!;
    const lastPhase = profile.phases[profile.phases.length - 1];

    expect(lastPhase.tuning_delta.energy).toBeLessThan(0); // Negative = lower energy
    expect(lastPhase.tuning_delta.warmth).toBeGreaterThan(0); // Positive = higher warmth
  });

  test("hype_wave maintains high energy throughout", () => {
    const profile = PREDEFINED_MOTION_PROFILES.find((p) => p.key === "hype_wave")!;

    for (const phase of profile.phases) {
      expect(phase.tuning_delta.energy || 0).toBeGreaterThanOrEqual(0);
    }
  });
});




