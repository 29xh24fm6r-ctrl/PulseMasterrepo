// Safety Rules Tests
// tests/safety/rules.test.ts

import { GLOBAL_DEFAULT_POLICY } from "@/lib/safety/seed";

describe("Safety Rules", () => {
  test("global default policy exists with hard rules", () => {
    expect(GLOBAL_DEFAULT_POLICY).toBeDefined();
    expect(GLOBAL_DEFAULT_POLICY.hard_rules.length).toBeGreaterThan(0);
  });

  test("no_sexual_content rule exists", () => {
    const rule = GLOBAL_DEFAULT_POLICY.hard_rules.find((r) => r.id === "no_sexual_content");
    expect(rule).toBeDefined();
    expect(rule?.action).toBe("block");
    expect(rule?.severity).toBe(5);
  });

  test("self_harm_route rule exists", () => {
    const rule = GLOBAL_DEFAULT_POLICY.hard_rules.find((r) => r.id === "self_harm_route");
    expect(rule).toBeDefined();
    expect(rule?.action).toBe("route_to_help");
    expect(rule?.severity).toBe(5);
  });

  test("violence_block rule exists", () => {
    const rule = GLOBAL_DEFAULT_POLICY.hard_rules.find((r) => r.id === "violence_block");
    expect(rule).toBeDefined();
    expect(rule?.action).toBe("block");
  });

  test("core values are defined", () => {
    expect(GLOBAL_DEFAULT_POLICY.core_values.length).toBeGreaterThan(0);
    expect(GLOBAL_DEFAULT_POLICY.core_values).toContain(
      "Never sexual with the user in any way."
    );
  });
});




