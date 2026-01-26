// lib/mcp/run-server.ts
// Entry point for running the Pulse Omega MCP server

import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local (Next.js convention)
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { startMcpServer } from "./pulse-mcp-server";

async function main() {
  console.log("[PulseMCP] Starting Pulse Omega MCP Server...");
  console.log("[PulseMCP] Resources available:");
  console.log("  - omega://schema - Database schema");
  console.log("  - omega://state/{userId} - Current omega state");
  console.log("  - omega://calibration/{userId} - Confidence calibration");
  console.log("  - omega://traces/{sessionId} - Reasoning traces");
  console.log("  - omega://improvements - Proposed improvements");
  console.log("  - omega://constraints/{userId} - User constraints");
  console.log("  - omega://autonomy/{userId} - Autonomy level");
  console.log("  - omega://workflows/recent - Recent Temporal workflows");
  console.log("[PulseMCP] Tools available:");
  console.log("  - omega_query - Query Omega data");
  console.log("  - omega_analyze_calibration - Analyze calibration");
  console.log("  - omega_get_reasoning_chain - Get reasoning chain");
  console.log("  - omega_propose_improvement - Propose improvement");
  console.log("  - omega_record_outcome - Record outcome");
  console.log("  - omega_check_autonomy - Check autonomy level");
  console.log("  - omega_send_test_signal - Send test signal");
  console.log("  - omega_approve_draft - Approve draft");

  try {
    await startMcpServer();
  } catch (error) {
    console.error("[PulseMCP] Fatal error:", error);
    process.exit(1);
  }
}

main();
