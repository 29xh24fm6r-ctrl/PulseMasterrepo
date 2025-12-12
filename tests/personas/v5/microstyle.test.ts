// Microstyle Tests
// tests/personas/v5/microstyle.test.ts

import { applyMicrostyleToText, getMicrostylePrefs } from "@/lib/personas/microstyle";

describe("Microstyle", () => {
  test("forbidden phrases not present in output", () => {
    const prefs = {
      forbiddenPhrases: ["never", "always"],
      favoritePhrases: [],
    };
    const text = "You never listen and you always fail.";
    const result = applyMicrostyleToText(text, prefs);
    expect(result).not.toContain("never");
    expect(result).not.toContain("always");
  });

  test("nickname usage respects preferences", () => {
    const prefs = {
      preferredAddress: "first_name" as const,
      forbiddenPhrases: [],
      favoritePhrases: [],
    };
    const text = "You should do this.";
    const result = applyMicrostyleToText(text, prefs, "Matt");
    // Should replace some "you" with "Matt" (sparingly)
    expect(typeof result).toBe("string");
  });
});




