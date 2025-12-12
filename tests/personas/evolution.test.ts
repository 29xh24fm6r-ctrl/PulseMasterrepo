// Persona Evolution Tests
// tests/personas/evolution.test.ts

import { evaluateStage } from "@/lib/personas/stages";
import { EvolutionContext } from "@/lib/personas/types";

describe("Persona Evolution", () => {
  test("evaluates base stage for new user", () => {
    const context: EvolutionContext = {
      xpRank: 0,
      careerLevel: "rookie",
      philosophyProgress: 0,
      emotionalStability: 0.5,
      journalingStreak: 0,
    };

    const stage = evaluateStage(context);
    expect(stage).toBe("base");
  });

  test("evaluates apprentice stage", () => {
    const context: EvolutionContext = {
      xpRank: 3000,
      careerLevel: "operator",
      philosophyProgress: 30,
      emotionalStability: 0.6,
      journalingStreak: 10,
    };

    const stage = evaluateStage(context);
    expect(stage).toBe("apprentice");
  });

  test("evaluates mastery stage", () => {
    const context: EvolutionContext = {
      xpRank: 8000,
      careerLevel: "pro",
      philosophyProgress: 70,
      emotionalStability: 0.8,
      journalingStreak: 20,
    };

    const stage = evaluateStage(context);
    expect(stage).toBe("mastery");
  });

  test("evaluates legend stage", () => {
    const context: EvolutionContext = {
      xpRank: 15000,
      careerLevel: "legend",
      philosophyProgress: 90,
      emotionalStability: 0.9,
      journalingStreak: 35,
    };

    const stage = evaluateStage(context);
    expect(stage).toBe("legend");
  });
});




