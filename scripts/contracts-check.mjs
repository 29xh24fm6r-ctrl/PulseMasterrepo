#!/usr/bin/env node
/**
 * CI Guard: Contract Harness Baseline Check
 * 
 * Ensures contract infrastructure exists and is in place.
 * This is a lightweight check - for strict enforcement, see contracts-check-strict.mjs
 * 
 * Usage:
 *   npm run contracts:check
 * 
 * Exit codes:
 *   0 = Contract infrastructure present
 *   1 = Missing required contract files
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "lib/contracts/contract-helpers.ts",
  "lib/contracts/admin-scheduler.contracts.ts",
];

console.log("🔍 Checking contract harness baseline...");

const missing = REQUIRED_FILES.filter((p) => {
  const fullPath = path.join(ROOT, p);
  return !fs.existsSync(fullPath);
});

if (missing.length > 0) {
  console.error("\n❌ Missing required contract files:");
  for (const m of missing) {
    console.error(`   - ${m}`);
  }
  console.error("\n💡 Fix: Ensure contract infrastructure is in place.");
  console.error("   See: docs/engineering/CONTRACTS.md\n");
  process.exit(1);
}

console.log("✅ Contract harness baseline present.");
console.log(`   Found ${REQUIRED_FILES.length} required contract files.`);
process.exit(0);

