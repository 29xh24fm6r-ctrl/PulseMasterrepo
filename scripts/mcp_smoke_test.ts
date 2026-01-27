/**
 * MCP Omega Gate Smoke Test
 *
 * Usage:
 *   MCP_BASE_URL=https://pulse-mcp-xxx.run.app \
 *   MCP_API_KEY=your-key \
 *   npx tsx scripts/mcp_smoke_test.ts
 */

const BASE_URL = process.env.MCP_BASE_URL ?? "http://localhost:8080";
const API_KEY = process.env.MCP_API_KEY ?? "";

function headers(scope: string, nonce: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-pulse-mcp-key": API_KEY,
    "x-pulse-mcp-agent": "internal",
    "x-pulse-mcp-scope": scope,
    "x-pulse-nonce": nonce,
    "x-pulse-ts": String(Date.now()),
  };
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  PASS  ${name}`);
  } catch (e: any) {
    console.error(`  FAIL  ${name}: ${e.message}`);
    process.exitCode = 1;
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

async function main() {
  console.log(`\nOmega Gate Smoke Test → ${BASE_URL}\n`);

  // Test 1: mcp.tick (read, should return 200)
  await test("mcp.tick returns 200 with audit_ref", async () => {
    const res = await fetch(`${BASE_URL}/call`, {
      method: "POST",
      headers: headers("read", `smoke-tick-${Date.now()}`),
      body: JSON.stringify({
        call_id: `smoke-tick-${Date.now()}`,
        tool: "mcp.tick",
        intent: "smoke_test_connectivity",
        inputs: { hello: "omega" },
      }),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const body = await res.json();
    assert(body.status === "executed", `Expected executed, got ${body.status}`);
    assert(!!body.audit_ref, "Missing audit_ref");
    assert(body.result?.artifacts?.[0]?.echo?.hello === "omega", "Echo mismatch");
  });

  // Test 2: plan.propose_patch (propose, should return 202 + proposal_id)
  await test("plan.propose_patch returns 202 with proposal_id", async () => {
    const res = await fetch(`${BASE_URL}/call`, {
      method: "POST",
      headers: headers("propose", `smoke-propose-${Date.now()}`),
      body: JSON.stringify({
        call_id: `smoke-propose-${Date.now()}`,
        tool: "plan.propose_patch",
        intent: "smoke_test_proposal",
        inputs: {
          target: "weekly_plan",
          patch: { add_item: "Review Q1 metrics" },
          summary: "Add Q1 metrics review to weekly plan",
        },
      }),
    });
    assert(res.status === 202, `Expected 202, got ${res.status}`);
    const body = await res.json();
    assert(body.status === "proposed", `Expected proposed, got ${body.status}`);
    assert(!!body.proposal_id, "Missing proposal_id");
    assert(!!body.audit_ref, "Missing audit_ref");
  });

  // Test 3: Replay protection (reuse nonce → 409)
  const replayNonce = `smoke-replay-${Date.now()}`;
  await test("replay protection blocks duplicate nonce", async () => {
    // First call succeeds
    const res1 = await fetch(`${BASE_URL}/call`, {
      method: "POST",
      headers: headers("read", replayNonce),
      body: JSON.stringify({
        call_id: `smoke-replay-1`,
        tool: "mcp.tick",
        intent: "first_call",
        inputs: {},
      }),
    });
    assert(res1.status === 200, `First call expected 200, got ${res1.status}`);

    // Second call with same nonce is blocked
    const res2 = await fetch(`${BASE_URL}/call`, {
      method: "POST",
      headers: headers("read", replayNonce),
      body: JSON.stringify({
        call_id: `smoke-replay-2`,
        tool: "mcp.tick",
        intent: "replay_attempt",
        inputs: {},
      }),
    });
    assert(res2.status === 409, `Replay expected 409, got ${res2.status}`);
  });

  // Test 4: Unknown tool → denied
  await test("unknown tool returns 404", async () => {
    const res = await fetch(`${BASE_URL}/call`, {
      method: "POST",
      headers: headers("read", `smoke-unknown-${Date.now()}`),
      body: JSON.stringify({
        call_id: `smoke-unknown-${Date.now()}`,
        tool: "does.not.exist",
        intent: "should_fail",
        inputs: {},
      }),
    });
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  console.log("\nDone.\n");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
