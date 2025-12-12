// Council Roster Tests
// tests/council/roster.test.ts

import { buildCouncilRoster } from "@/lib/council/roster";

describe("Council Roster", () => {
  test("emotional_support mode includes confidant as primary", () => {
    const roster = buildCouncilRoster({
      mode: "emotional_support",
      primaryCoachId: "confidant",
    });

    const primary = roster.find((m) => m.role === "primary");
    expect(primary?.coachId).toBe("confidant");
    expect(roster.length).toBeGreaterThan(1);
  });

  test("advisory mode includes primary coach and career", () => {
    const roster = buildCouncilRoster({
      mode: "advisory",
      primaryCoachId: "career",
    });

    const primary = roster.find((m) => m.role === "primary");
    expect(primary?.coachId).toBe("career");
    const career = roster.find((m) => m.coachId === "career");
    expect(career).toBeDefined();
  });

  test("performance mode includes autopilot", () => {
    const roster = buildCouncilRoster({
      mode: "performance",
      primaryCoachId: "sales",
    });

    const autopilot = roster.find((m) => m.coachId === "autopilot");
    expect(autopilot).toBeDefined();
    expect(autopilot?.role).toBe("secondary");
  });

  test("crisis mode prioritizes confidant", () => {
    const roster = buildCouncilRoster({
      mode: "crisis",
      primaryCoachId: "career",
    });

    const confidant = roster.find((m) => m.coachId === "confidant");
    expect(confidant).toBeDefined();
    expect(confidant?.role).toBe("primary");
    expect(confidant?.weight).toBeGreaterThan(1.5);
  });
});




