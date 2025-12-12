// AGI Scenario Tests
// lib/agi/testing/scenarios.test.ts

import { buildTestWorldState, getExpectedBehaviors } from "./harness";
import { planFromAgentResults } from "../planner";
import { identityAgent } from "../agents/identityAgent";
import { emotionAgent } from "../agents/emotionAgent";
import { executiveFunctionAgent } from "../agents/executiveFunctionAgent";
import { makeAgentResult } from "../agents";

/**
 * Test Planner v2 with stressed emotion
 */
export async function testPlannerWithStressedEmotion() {
  const worldState = buildTestWorldState("rising_stress");
  
  // Mock agent results
  const agentResults = [
    await identityAgent.run({ userId: "test", world: worldState, trigger: { type: "manual" } }),
    await emotionAgent.run({ userId: "test", world: worldState, trigger: { type: "manual" } }),
    await executiveFunctionAgent.run({ userId: "test", world: worldState, trigger: { type: "manual" } }),
  ];

  const finalPlan = planFromAgentResults(worldState, agentResults, { maxActions: 10 });

  // Assertions
  const nudges = finalPlan.filter((a) => a.type === "nudge_user");
  const highRiskTasks = finalPlan.filter((a) => a.type === "create_task" && a.riskLevel === "high");

  console.log("[Test] Planner with stressed emotion:");
  console.log(`  - Total actions: ${finalPlan.length}`);
  console.log(`  - Nudges: ${nudges.length} (should be boosted)`);
  console.log(`  - High-risk tasks: ${highRiskTasks.length} (should be penalized)`);

  return {
    passed: nudges.length > 0 && highRiskTasks.length === 0,
    details: {
      totalActions: finalPlan.length,
      nudgesCount: nudges.length,
      highRiskCount: highRiskTasks.length,
    },
  };
}

/**
 * Test IdentityAgent with misaligned identity
 */
export async function testIdentityMisalignment() {
  const worldState = buildTestWorldState("identity_misaligned");
  
  const result = await identityAgent.run({
    userId: "test",
    world: worldState,
    trigger: { type: "manual" },
  });

  // Check that IdentityAgent proposes role-balancing actions
  const roleActions = result.proposedActions.filter((a) =>
    a.label.toLowerCase().includes("family") ||
    a.label.toLowerCase().includes("role") ||
    a.label.toLowerCase().includes("balance")
  );

  console.log("[Test] Identity misalignment:");
  console.log(`  - Total actions: ${result.proposedActions.length}`);
  console.log(`  - Role-balancing actions: ${roleActions.length} (should be >0)`);
  console.log(`  - Reasoning: ${result.reasoningSummary}`);

  return {
    passed: roleActions.length > 0,
    details: {
      totalActions: result.proposedActions.length,
      roleActionsCount: roleActions.length,
      reasoning: result.reasoningSummary,
    },
  };
}

/**
 * Test ExecutiveFunctionAgent with overload
 */
export async function testExecutiveFunctionOverload() {
  const worldState = buildTestWorldState("overload_day");
  
  const result = await executiveFunctionAgent.run({
    userId: "test",
    world: worldState,
    trigger: { type: "manual" },
  });

  const overloadActions = result.proposedActions.filter((a) =>
    a.label.toLowerCase().includes("overload") ||
    a.label.toLowerCase().includes("simplify") ||
    a.label.toLowerCase().includes("triage")
  );

  console.log("[Test] Executive function overload:");
  console.log(`  - Total actions: ${result.proposedActions.length}`);
  console.log(`  - Overload actions: ${overloadActions.length} (should be >0)`);
  console.log(`  - Reasoning: ${result.reasoningSummary}`);

  return {
    passed: overloadActions.length > 0,
    details: {
      totalActions: result.proposedActions.length,
      overloadActionsCount: overloadActions.length,
      reasoning: result.reasoningSummary,
    },
  };
}

/**
 * Test EmotionAgent with rising stress
 */
export async function testEmotionRisingStress() {
  const worldState = buildTestWorldState("rising_stress");
  
  const result = await emotionAgent.run({
    userId: "test",
    world: worldState,
    trigger: { type: "manual" },
  });

  const recoveryActions = result.proposedActions.filter((a) =>
    a.label.toLowerCase().includes("recovery") ||
    a.label.toLowerCase().includes("break") ||
    a.label.toLowerCase().includes("stress")
  );

  console.log("[Test] Emotion rising stress:");
  console.log(`  - Total actions: ${result.proposedActions.length}`);
  console.log(`  - Recovery actions: ${recoveryActions.length} (should be >0)`);
  console.log(`  - Reasoning: ${result.reasoningSummary}`);

  return {
    passed: recoveryActions.length > 0 && result.reasoningSummary.includes("rising"),
    details: {
      totalActions: result.proposedActions.length,
      recoveryActionsCount: recoveryActions.length,
      reasoning: result.reasoningSummary,
    },
  };
}

/**
 * Run all scenario tests
 */
export async function runAllScenarioTests() {
  console.log("\n=== AGI Scenario Tests ===\n");

  const results = {
    plannerStressed: await testPlannerWithStressedEmotion(),
    identityMisaligned: await testIdentityMisalignment(),
    execOverload: await testExecutiveFunctionOverload(),
    emotionRising: await testEmotionRisingStress(),
  };

  const allPassed = Object.values(results).every((r) => r.passed);

  console.log("\n=== Test Summary ===");
  console.log(`Planner (stressed): ${results.plannerStressed.passed ? "✅" : "❌"}`);
  console.log(`Identity (misaligned): ${results.identityMisaligned.passed ? "✅" : "❌"}`);
  console.log(`Executive (overload): ${results.execOverload.passed ? "✅" : "❌"}`);
  console.log(`Emotion (rising stress): ${results.emotionRising.passed ? "✅" : "❌"}`);
  console.log(`\nOverall: ${allPassed ? "✅ ALL PASSED" : "❌ SOME FAILED"}`);

  return {
    allPassed,
    results,
  };
}



