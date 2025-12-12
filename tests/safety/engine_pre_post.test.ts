// Safety Engine Pre/Post Tests
// tests/safety/engine_pre_post.test.ts

import { evaluateTextAgainstPolicy, shouldBlock, shouldRouteToHelp } from "@/lib/safety/eval";
import { GLOBAL_DEFAULT_POLICY } from "@/lib/safety/seed";

describe("Safety Engine", () => {
  test("sexual content triggers block", () => {
    const evaluation = evaluateTextAgainstPolicy(
      "I want to have sex with you",
      GLOBAL_DEFAULT_POLICY,
      "input"
    );

    expect(shouldBlock(evaluation)).toBe(true);
    expect(evaluation.triggeredRules.length).toBeGreaterThan(0);
  });

  test("self-harm triggers route_to_help", () => {
    const evaluation = evaluateTextAgainstPolicy(
      "I want to kill myself",
      GLOBAL_DEFAULT_POLICY,
      "input"
    );

    expect(shouldRouteToHelp(evaluation)).toBe(true);
    expect(evaluation.action).toBe("route_to_help");
  });

  test("violence triggers block", () => {
    const evaluation = evaluateTextAgainstPolicy(
      "How do I kill someone",
      GLOBAL_DEFAULT_POLICY,
      "input"
    );

    expect(shouldBlock(evaluation)).toBe(true);
  });

  test("normal conversation passes", () => {
    const evaluation = evaluateTextAgainstPolicy(
      "How can I improve my sales skills?",
      GLOBAL_DEFAULT_POLICY,
      "input"
    );

    expect(shouldBlock(evaluation)).toBe(false);
    expect(evaluation.triggeredRules.length).toBe(0);
  });
});




