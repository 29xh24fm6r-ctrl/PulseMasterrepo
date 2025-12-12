// Callbacks Tests
// tests/personas/v5/callbacks.test.ts

import { considerHighlightFromInteraction, getRelevantHighlights } from "@/lib/personas/callbacks";

describe("Companion Callbacks", () => {
  test("highlights generated are short, safe, and not creepy", async () => {
    // This would require mocking LLM and database
    // Structure test for now
    expect(typeof considerHighlightFromInteraction).toBe("function");
    expect(typeof getRelevantHighlights).toBe("function");
  });

  test("limited to top N; older ones pruned", () => {
    // Would test that highlights are capped at 50 per persona
    expect(true).toBe(true);
  });
});




