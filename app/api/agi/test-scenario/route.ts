// AGI Test Scenario API
// POST /api/agi/test-scenario - Run synthetic AGI test scenarios

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { runAGITestScenario, TestScenario } from "@/lib/agi/testing/harness";
import { runAllScenarioTests } from "@/lib/agi/testing/scenarios.test";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { scenario, runAll } = body;

    if (runAll) {
      // Run all scenario tests
      const results = await runAllScenarioTests();
      return NextResponse.json({
        success: true,
        allPassed: results.allPassed,
        results: results.results,
      });
    }

    if (!scenario) {
      return NextResponse.json(
        { error: "scenario is required (or set runAll: true)" },
        { status: 400 }
      );
    }

    const validScenarios: TestScenario[] = [
      "overload_day",
      "procrastination",
      "identity_misaligned",
      "ideal_day",
      "rising_stress",
      "empty_state",
    ];

    if (!validScenarios.includes(scenario as TestScenario)) {
      return NextResponse.json(
        { error: `Invalid scenario. Must be one of: ${validScenarios.join(", ")}` },
        { status: 400 }
      );
    }

    const testResult = await runAGITestScenario(scenario as TestScenario, userId);

    return NextResponse.json({
      success: true,
      scenario,
      testResult,
    });
  } catch (err: any) {
    console.error("[AGI Test Scenario] Error:", err);
    return NextResponse.json({ error: err.message || "Test failed" }, { status: 500 });
  }
}



