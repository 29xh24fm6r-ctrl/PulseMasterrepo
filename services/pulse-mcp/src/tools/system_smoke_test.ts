// tools/system_smoke_test.ts
// One call = total system confidence.
// Calls key tools through the executor and reports pass/fail.
// Never throws — always returns structured status.

import { executeGateTool } from "../omega-gate/executor.js";

const SMOKE_TOOLS = [
  "mcp.tick",
  "context.current",
  "trust.state",
  "memory.recent",
  "decision.recent",
  "triggers.list",
];

export async function systemSmokeTest(input: unknown): Promise<{
  summary: string;
  tools: Record<string, "ok" | "error">;
}> {
  const targetUserId = (input as Record<string, unknown>)?.target_user_id;
  const results: Record<string, "ok" | "error"> = {};

  for (const tool of SMOKE_TOOLS) {
    try {
      const result = await executeGateTool({
        call_id: `smoke-${tool}-${Date.now()}`,
        tool,
        intent: `Smoke test: ${tool}`,
        inputs: targetUserId ? { target_user_id: targetUserId } : {},
      });

      // "No executor for tool" means tool isn't wired — count as error
      results[tool] = result.summary.startsWith("No executor") ? "error" : "ok";
    } catch {
      results[tool] = "error";
    }
  }

  const allOk = Object.values(results).every((v) => v === "ok");

  return {
    summary: allOk ? "All tools operational" : "Some tools failed",
    tools: results,
  };
}
