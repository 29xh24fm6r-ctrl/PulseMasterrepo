// AGI Test Harness - Synthetic scenarios for testing
// lib/agi/testing/harness.ts

import { WorldState, AGITriggerContext } from "../types";
import { runAGIKernel } from "../kernel";
import { scheduleTickTrigger } from "../triggers";

export type TestScenario =
  | "overload_day"
  | "procrastination"
  | "identity_misaligned"
  | "ideal_day"
  | "rising_stress"
  | "empty_state";

/**
 * Build synthetic WorldState for testing scenarios
 */
export function buildTestWorldState(
  scenario: TestScenario,
  userId: string = "test_user"
): WorldState {
  const baseState: WorldState = {
    userId,
    time: {
      now: new Date().toISOString(),
      timezone: "America/New_York",
      upcomingEvents: [],
      overdueTasks: [],
      todayTasks: [],
    },
    work: {
      activeDeals: [],
      keyDeadlines: [],
      blockedItems: [],
    },
    relationships: {
      importantContacts: [],
      atRiskRelationships: [],
      checkinsDue: [],
    },
    finances: {
      cashflowSummary: null,
      upcomingBills: [],
      anomalies: [],
    },
    identity: {
      roles: [],
      priorities: [],
      values: [],
    },
    meta: {
      agiLevel: "assist",
    },
  };

  switch (scenario) {
    case "overload_day": {
      // Packed calendar + overdue tasks
      const now = new Date();
      const events = [];
      for (let i = 0; i < 12; i++) {
        const start = new Date(now);
        start.setHours(8 + i, 0, 0, 0);
        events.push({
          id: `event_${i}`,
          title: i % 2 === 0 ? "Client Meeting" : "Deep Work Block",
          start_time: start.toISOString(),
          end_time: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
          importanceScore: i % 3 === 0 ? 0.8 : 0.5,
          emotionalLoad: i % 4 === 0 ? "high" : "medium",
          energyRequirement: i % 2 === 0 ? "high" : "medium",
          category: i % 2 === 0 ? "meeting" : "deep_work",
        });
      }

      const overdueTasks = [];
      for (let i = 0; i < 8; i++) {
        const dueDate = new Date(now);
        dueDate.setDate(dueDate.getDate() - (i + 1));
        overdueTasks.push({
          id: `task_${i}`,
          name: `Overdue Task ${i + 1}`,
          dueDate: dueDate.toISOString(),
          priority: i % 3 === 0 ? "0.8" : "0.5",
        });
      }

      return {
        ...baseState,
        time: {
          ...baseState.time,
          upcomingEvents: events,
          overdueTasks,
          todayTasks: [
            { id: "today1", name: "Today Task 1", dueDate: now.toISOString(), priority: "0.7" },
            { id: "today2", name: "Today Task 2", dueDate: now.toISOString(), priority: "0.6" },
          ],
          dayFeatures: {
            overloadScore: 0.95,
            fragmentationScore: 0.8,
            opportunityBlocks: [],
          },
        },
        work: {
          ...baseState.work,
          blockedItems: [
            { id: "blocked1", name: "Blocked Task", reason: "Waiting on dependency" },
          ],
        },
      };
    }

    case "procrastination": {
      // Tasks repeatedly rolled forward
      const now = new Date();
      const overdueTasks = [];
      for (let i = 0; i < 5; i++) {
        const dueDate = new Date(now);
        dueDate.setDate(dueDate.getDate() - (i + 5)); // 5-9 days overdue
        overdueTasks.push({
          id: `procrast_${i}`,
          name: `Procrastinated Task ${i + 1}`,
          dueDate: dueDate.toISOString(),
          priority: "0.7",
          // Simulate multiple updates (rollovers)
          updated_at: new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      return {
        ...baseState,
        time: {
          ...baseState.time,
          overdueTasks,
        },
      };
    }

    case "identity_misaligned": {
      // Family/health roles but only work tasks
      return {
        ...baseState,
        identity: {
          roles: ["Dad", "Founder", "Loan Officer"],
          priorities: ["Family", "Health", "Work"],
          values: ["Family First", "Health", "Growth"],
          archetype: "warrior",
          strengths: ["consistency", "productivity"],
          blindspots: ["work_life_balance"],
        },
        time: {
          ...baseState.time,
          todayTasks: [
            { id: "work1", name: "Client Call", dueDate: new Date().toISOString(), priority: "0.8" },
            { id: "work2", name: "Deal Review", dueDate: new Date().toISOString(), priority: "0.9" },
            { id: "work3", name: "Pipeline Update", dueDate: new Date().toISOString(), priority: "0.7" },
            { id: "work4", name: "Email Follow-ups", dueDate: new Date().toISOString(), priority: "0.6" },
            { id: "work5", name: "Strategy Session", dueDate: new Date().toISOString(), priority: "0.8" },
          ],
          upcomingEvents: [
            {
              id: "meeting1",
              title: "Client Meeting",
              start_time: new Date().toISOString(),
              end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
              category: "meeting",
            },
            {
              id: "meeting2",
              title: "Team Standup",
              start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
              end_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
              category: "meeting",
            },
          ],
        },
        work: {
          ...baseState.work,
          activeDeals: [
            { id: "deal1", name: "High-Value Deal", amount: 50000, stage: "proposal" },
          ],
        },
      };
    }

    case "rising_stress": {
      return {
        ...baseState,
        emotion: {
          currentState: "stressed",
          recentTrend: "rising",
          intensity: 0.85,
        },
        time: {
          ...baseState.time,
          overdueTasks: [
            { id: "stress1", name: "Urgent Task", dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), priority: "0.9" },
            { id: "stress2", name: "Another Urgent", dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), priority: "0.8" },
          ],
        },
        work: {
          ...baseState.work,
          blockedItems: [
            { id: "block1", name: "Blocked by dependency", reason: "Waiting" },
          ],
        },
      };
    }

    case "ideal_day": {
      // Mostly aligned, check AGI doesn't overreact
      return {
        ...baseState,
        identity: {
          roles: ["Founder"],
          priorities: ["Growth", "Execution"],
          values: ["Excellence"],
          archetype: "strategist",
          strengths: ["consistency", "strategic_thinking"],
        },
        emotion: {
          currentState: "energized",
          recentTrend: "stable",
          intensity: 0.6,
        },
        time: {
          ...baseState.time,
          todayTasks: [
            { id: "ideal1", name: "Priority Task 1", dueDate: new Date().toISOString(), priority: "0.8" },
            { id: "ideal2", name: "Priority Task 2", dueDate: new Date().toISOString(), priority: "0.7" },
          ],
          upcomingEvents: [
            {
              id: "ideal_event",
              title: "Focus Block",
              start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
              end_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
              category: "deep_work",
            },
          ],
          dayFeatures: {
            overloadScore: 0.3,
            fragmentationScore: 0.2,
            opportunityBlocks: [
              {
                start: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
                end: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
                durationMinutes: 120,
                quality: "excellent",
              },
            ],
          },
        },
      };
    }

    case "empty_state": {
      // Minimal data - test graceful handling
      return baseState;
    }

    default:
      return baseState;
  }
}

/**
 * Run AGI test scenario - actually runs kernel with test worldstate
 */
export async function runAGITestScenario(
  scenario: TestScenario,
  userId: string = "test_user"
): Promise<any> {
  const worldState = buildTestWorldState(scenario, userId);
  const trigger: AGITriggerContext = scheduleTickTrigger("test/scenario");

  console.log(`[AGI Test] Running scenario: ${scenario}`);
  console.log(`[AGI Test] WorldState summary:`, {
    tasks: worldState.time.todayTasks.length + worldState.time.overdueTasks.length,
    events: worldState.time.upcomingEvents.length,
    emotion: worldState.emotion?.currentState,
    identity: worldState.identity.roles.length,
  });

  try {
    // Actually run the kernel with test worldstate
    const { runAGIKernel } = await import("../kernel");
    const runResult = await runAGIKernel(userId, trigger, {
      worldStateOverride: worldState,
    });

    return {
      scenario,
      runResult,
      expectedBehaviors: getExpectedBehaviors(scenario),
      passed: validateScenarioResults(scenario, runResult),
    };
  } catch (err: any) {
    console.error(`[AGI Test] Scenario ${scenario} failed:`, err);
    return {
      scenario,
      error: err.message,
      expectedBehaviors: getExpectedBehaviors(scenario),
      passed: false,
    };
  }
}

/**
 * Validate that results match expected behaviors
 */
function validateScenarioResults(scenario: TestScenario, runResult: any): boolean {
  const plan = runResult.finalPlan || [];
  const agentResults = runResult.agentResults || [];

  switch (scenario) {
    case "overload_day": {
      const execAgent = agentResults.find((r: any) => r.agentName === "ExecutiveFunctionAgent");
      const hasOverloadAction = plan.some((a: any) =>
        a.label.toLowerCase().includes("overload") ||
        a.label.toLowerCase().includes("simplify") ||
        a.label.toLowerCase().includes("triage")
      );
      return execAgent && hasOverloadAction;
    }

    case "procrastination": {
      const execAgent = agentResults.find((r: any) => r.agentName === "ExecutiveFunctionAgent");
      const hasProcrastinationAction = plan.some((a: any) =>
        a.label.toLowerCase().includes("procrastination") ||
        a.label.toLowerCase().includes("triage") ||
        a.label.toLowerCase().includes("break")
      );
      return execAgent && execAgent.reasoningSummary.toLowerCase().includes("procrastination");
    }

    case "identity_misaligned": {
      const identityAgent = agentResults.find((r: any) => r.agentName === "IdentityAgent");
      const hasRoleAction = plan.some((a: any) =>
        a.label.toLowerCase().includes("family") ||
        a.label.toLowerCase().includes("role") ||
        a.label.toLowerCase().includes("balance")
      );
      return identityAgent && hasRoleAction;
    }

    case "rising_stress": {
      const emotionAgent = agentResults.find((r: any) => r.agentName === "EmotionAgent");
      const hasRecoveryAction = plan.some((a: any) =>
        a.label.toLowerCase().includes("recovery") ||
        a.label.toLowerCase().includes("break") ||
        a.label.toLowerCase().includes("stress")
      );
      return emotionAgent && emotionAgent.reasoningSummary.toLowerCase().includes("rising");
    }

    case "ideal_day": {
      // Should not overreact - minimal actions
      return plan.length <= 5;
    }

    case "empty_state": {
      // Should handle gracefully - no errors
      return true; // If we got here, no errors occurred
    }

    default:
      return false;
  }
}

/**
 * Expected behaviors for each scenario
 */
function getExpectedBehaviors(scenario: TestScenario): string[] {
  switch (scenario) {
    case "overload_day":
      return [
        "ExecutiveFunctionAgent flags overload (>10 commitments)",
        "ExecutiveFunctionAgent suggests triage or simplification",
        "Planner down-ranks actions that add complexity",
        "Actions focus on reducing load, not adding tasks",
      ];

    case "procrastination":
      return [
        "ExecutiveFunctionAgent detects procrastination pattern (tasks overdue >3 days)",
        "ExecutiveFunctionAgent suggests breaking tasks into smaller steps",
        "Planner favors low-risk, atomic actions",
      ];

    case "identity_misaligned":
      return [
        "IdentityAgent flags neglected family/health roles",
        "IdentityAgent proposes scheduling family/health time",
        "Actions include role-balancing, not only work tasks",
      ];

    case "rising_stress":
      return [
        "EmotionAgent detects rising stress trend",
        "EmotionAgent proposes recovery actions",
        "Planner penalizes high-complexity actions",
        "Supportive nudges boosted",
      ];

    case "ideal_day":
      return [
        "AGI does not overreact to well-structured day",
        "No unnecessary simplification or triage suggestions",
        "Actions are supportive, not corrective",
      ];

    case "empty_state":
      return [
        "No errors or crashes with minimal data",
        "Agents handle empty arrays gracefully",
        "Planner returns empty or minimal plan",
      ];

    default:
      return [];
  }
}

