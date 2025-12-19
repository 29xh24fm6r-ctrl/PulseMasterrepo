#!/usr/bin/env node
/**
 * CI Guard: Detect internal HTTP calls in server routes
 * 
 * This script scans all server route files and flags
 * any fetch() calls that target internal Pulse API routes (/api/...).
 * 
 * Usage:
 *   npm run guard:no-internal-http
 * 
 * Exit codes:
 *   0 = No violations found
 *   1 = Violations found (CI should fail)
 * 
 * See: docs/ARCHITECTURE_RULES.md
 */

const fs = require("fs");
const path = require("path");

const API_DIR = path.join(process.cwd(), "app", "api");
const VIOLATIONS = [];

// Patterns that indicate internal HTTP calls
const INTERNAL_HTTP_PATTERNS = [
  // fetch("/api/...")
  /fetch\s*\(\s*["']\/api\//g,
  // fetch(`${...}/api/...`)
  /fetch\s*\(\s*[`'"]\$\{.*\}\/api\//g,
  // fetch(process.env.NEXT_PUBLIC_APP_URL + "/api/...")
  /fetch\s*\(\s*[`'"].*NEXT_PUBLIC.*\/api\//g,
  // fetch(new URL("/api/...", ...))
  /fetch\s*\(\s*new\s+URL\s*\(\s*["']\/api\//g,
];

// Patterns that are OK (external APIs)
const EXTERNAL_OK_PATTERNS = [
  /https?:\/\/(?!localhost|127\.0\.0\.1)[^\s"']+/g, // External URLs
  /twilio/i,
  /openai/i,
  /anthropic/i,
  /brave/i,
  /notion/i,
  /supabase\.co/i,
  /vercel/i,
  /search\.brave\.com/i,
  /api\.search\.brave\.com/i,
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith("//") || line.trim().startsWith("*")) {
      return;
    }

    // Check for internal HTTP patterns
    for (const pattern of INTERNAL_HTTP_PATTERNS) {
      const matches = [...line.matchAll(pattern)];
      for (const match of matches) {
        const matchText = match[0];
        
        // Check if it's an external API (OK)
        const isExternal = EXTERNAL_OK_PATTERNS.some((okPattern) =>
          line.match(okPattern)
        );

        if (!isExternal) {
          VIOLATIONS.push({
            file: path.relative(process.cwd(), filePath),
            line: index + 1,
            match: matchText.substring(0, 80),
          });
        }
      }
    }
  });
}

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules, .next, etc.
      if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile() && entry.name === "route.ts") {
      scanFile(fullPath);
    }
  }
}

function main() {
  console.log("🔍 Scanning server routes for internal HTTP calls...\n");

  if (!fs.existsSync(API_DIR)) {
    console.error(`❌ API directory not found: ${API_DIR}`);
    process.exit(1);
  }

  scanDirectory(API_DIR);

  if (VIOLATIONS.length === 0) {
    console.log("✅ No internal HTTP calls detected in server routes.\n");
    console.log("   All server routes correctly use direct function imports.\n");
    process.exit(0);
  }

  console.error(`❌ Found ${VIOLATIONS.length} violation(s):\n`);
  VIOLATIONS.forEach((v) => {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    ${v.match}...\n`);
  });

  console.error("\n💡 Fix: Extract shared logic into lib/ and import directly.");
  console.error("   See: docs/ARCHITECTURE_RULES.md\n");
  console.error("   Rule: Server routes may NOT call other server routes via HTTP.\n");

  process.exit(1);
}

main();

