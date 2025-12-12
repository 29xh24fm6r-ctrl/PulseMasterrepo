// Digital Twin Tests
// tests/simulation/twin.test.ts

import { createDefaultTwin, updateTwinState } from "@/lib/simulation/twin";

describe("Digital Twin", () => {
  test("creates default twin with valid ranges", () => {
    const twin = createDefaultTwin();
    expect(twin.energy).toBeGreaterThanOrEqual(0);
    expect(twin.energy).toBeLessThanOrEqual(100);
    expect(twin.stress).toBeGreaterThanOrEqual(0);
    expect(twin.stress).toBeLessThanOrEqual(100);
    expect(twin.mood).toBeGreaterThanOrEqual(-50);
    expect(twin.mood).toBeLessThanOrEqual(50);
  });

  test("updateTwinState clamps values to valid ranges", () => {
    const twin = createDefaultTwin();
    const updated = updateTwinState(twin, {
      energy: 150, // Should clamp to 100
      stress: -10, // Should clamp to 0
      mood: 100, // Should clamp to 50
    });
    expect(updated.energy).toBe(100);
    expect(updated.stress).toBe(0);
    expect(updated.mood).toBe(50);
  });
});




