#!/usr/bin/env node
/**
 * CI Guard: Feature Registry Generation Check
 * 
 * Ensures the generated registry is up to date.
 * 
 * Usage:
 *   npm run features:check
 * 
 * Exit codes:
 *   0 = Registry is up to date
 *   1 = Registry needs regeneration
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

try {
  // Generate registry
  execSync("npm run features:gen", { stdio: "inherit", cwd: ROOT });
  
  // Check if there are any changes
  const diff = execSync("git diff --name-only lib/features/registry.generated.ts", { encoding: "utf8", cwd: ROOT }).trim();
  
  if (diff) {
    console.error("❌ Feature registry is out of date. Run npm run features:gen and commit changes.");
    console.error("Changed file:", diff);
    process.exit(1);
  }
  
  console.log("✅ Feature registry up to date");
} catch (e) {
  console.error("❌ Failed to check feature registry:", e.message);
  process.exit(1);
}

