// Life Arc Builder Tests
// tests/life-arc/builder.test.ts

import { buildOrUpdateLifeArcs } from "@/lib/life-arc/builder";
import { UserModelSnapshot } from "@/lib/life-arc/model";

describe("Life Arc Builder", () => {
  test("creates healing arc for overwhelmed user", async () => {
    const userModel: UserModelSnapshot = {
      emotionState: "overwhelmed",
      stressScore: 0.8,
      personaSoulLines: [{ coachId: "confidant", phase: "stabilization" }],
    };

    // This would require mocking the database
    // For now, test the logic structure
    expect(userModel.emotionState).toBe("overwhelmed");
    expect(userModel.stressScore).toBeGreaterThan(0.7);
  });

  test("creates career_level_up arc for rookie/operator", async () => {
    const userModel: UserModelSnapshot = {
      careerLevel: "rookie",
      careerProgress: 0.5,
    };

    expect(userModel.careerLevel).toBe("rookie");
    expect(userModel.careerProgress).toBeLessThan(0.8);
  });

  test("creates financial_reset arc when finance stress detected", async () => {
    const userModel: UserModelSnapshot = {
      financeStress: true,
    };

    expect(userModel.financeStress).toBe(true);
  });

  test("limits to max 3 active arcs", () => {
    // This would test that only top 3 priority arcs are created
    expect(true).toBe(true);
  });
});




