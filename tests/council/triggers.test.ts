// Council Triggers Tests
// tests/council/triggers.test.ts

import { detectCouncilNeed } from "@/lib/council/triggers";

describe("Council Triggers", () => {
  test("emotional support triggers on overwhelmed state", () => {
    const result = detectCouncilNeed({
      primaryCoachId: "confidant",
      userInput: "I feel overwhelmed and I don't know what to do",
      emotionState: "overwhelmed",
      stressScore: 0.7,
    });

    expect(result.useCouncil).toBe(true);
    expect(result.mode).toBe("emotional_support");
  });

  test("advisory triggers on major decision language", () => {
    const result = detectCouncilNeed({
      primaryCoachId: "career",
      userInput: "What should I do about my job? Should I quit?",
      emotionState: "neutral",
      stressScore: 0.3,
    });

    expect(result.useCouncil).toBe(true);
    expect(result.mode).toBe("advisory");
  });

  test("performance triggers on stuck language with sales coach", () => {
    const result = detectCouncilNeed({
      primaryCoachId: "sales",
      userInput: "I'm stuck and can't take action",
      emotionState: "neutral",
      stressScore: 0.4,
    });

    expect(result.useCouncil).toBe(true);
    expect(result.mode).toBe("performance");
  });

  test("normal questions do not trigger council", () => {
    const result = detectCouncilNeed({
      primaryCoachId: "career",
      userInput: "How can I improve my sales skills?",
      emotionState: "neutral",
      stressScore: 0.2,
    });

    expect(result.useCouncil).toBe(false);
  });
});




