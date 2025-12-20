// scripts/sentinel/nightly.mjs
/**
 * Entry point for Simulation Sentinel (runs TypeScript runner via tsx)
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runnerPath = path.resolve(__dirname, "nightly-runner.ts");

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", encoding: "utf8", ...opts });
  if (r.error) throw r.error;
  return r;
}

function main() {
  // Check if tsx is available
  const tsxCheck = sh("npx", ["tsx", "--version"], { stdio: "pipe" });
  if (tsxCheck.status !== 0) {
    console.error("\n❌ tsx is required to run TypeScript modules.");
    console.error("Install with: npm install -D tsx\n");
    process.exit(1);
  }

  // Run the TypeScript runner
  const result = sh("npx", ["tsx", runnerPath], {
    env: {
      ...process.env,
      // Ensure git identity is set
      GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME || "Simulation Sentinel",
      GIT_AUTHOR_EMAIL: process.env.GIT_AUTHOR_EMAIL || "sentinel@users.noreply.github.com",
      GIT_COMMITTER_NAME: process.env.GIT_COMMITTER_NAME || "Simulation Sentinel",
      GIT_COMMITTER_EMAIL: process.env.GIT_COMMITTER_EMAIL || "sentinel@users.noreply.github.com",
    },
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

main();
