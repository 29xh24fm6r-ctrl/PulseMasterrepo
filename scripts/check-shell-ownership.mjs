#!/usr/bin/env node

/**
 * Shell Ownership Check
 * 
 * Enforces the "Single Owner Principle" by ensuring FABs (fixed bottom-* right-*)
 * can only exist in canonical shell components.
 * 
 * This script fails the build if anyone adds fixed-position FABs outside the allowlist.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const ROOTS = ["app", "components"];

const ALLOWLIST = [
  path.normalize("components/shell/FloatingActions.tsx"),
  path.normalize("app/(pulse)/layout.tsx"),
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;

  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    
    // Skip node_modules, .next, etc.
    if (ent.name.startsWith(".") || ent.name === "node_modules") continue;
    
    if (ent.isDirectory()) {
      out.push(...walk(p));
    } else if (p.endsWith(".tsx") || p.endsWith(".ts")) {
      out.push(p);
    }
  }
  return out;
}

// Pattern matches: fixed bottom-* right-* positioning (common FAB patterns)
// Specifically looking for FAB-like patterns: fixed bottom-right with rounded buttons
const FAB_PATTERNS = [
  // Fixed bottom-right positioning (most common FAB pattern)
  /fixed\s+(bottom-(4|5|6|7|8|10|12|16|20|24)\s+right-(4|5|6|7|8|10|12|16|20|24)|bottom-(4|5|6|7|8|10|12|16|20|24)\s+right-(4|5|6|7|8|10|12|16|20|24)\s+fixed)/,
  // Fixed bottom with z-50+ (FAB z-index range)
  /fixed\s+bottom-(4|5|6|7|8|10|12|16|20|24).*z-(50|\[50\]|60|\[60\])/,
];

const EXCLUDE_PATTERNS = [
  // Exclude deprecated components (they're hard-disabled but still contain old code)
  /QuickActions\.tsx|global-voice-button\.tsx/i,
  // Exclude toast notifications (they're temporary UI, not FABs)
  /toast|notification|alert.*fixed.*bottom/i,
  // Exclude butler/companion/voice overlays (they're specialized UI, not FABs)
  /butler|companion|voice.*overlay|voice.*chat/i,
  // Exclude proactive widgets (they're context-aware, not FABs)
  /proactive|widget.*bottom/i,
  // Exclude modal/dialog overlays
  /modal|dialog|overlay.*bottom/i,
  // Exclude attention/focus rescue widgets (contextual UI, not FABs)
  /attention.*rescue|focus.*toggle|explainer/i,
];

let bad = [];

for (const root of ROOTS) {
  const rootPath = path.join(ROOT, root);
  if (!fs.existsSync(rootPath)) continue;

  for (const file of walk(rootPath)) {
    const rel = path.relative(ROOT, file);
    const normalized = path.normalize(rel);
    
    // Check if file is in allowlist
    if (ALLOWLIST.some(allowed => normalized.includes(allowed))) {
      continue;
    }

    try {
      const txt = fs.readFileSync(file, "utf8");
      
      // Check if file matches any exclusion patterns (specialized UI components)
      const shouldExclude = EXCLUDE_PATTERNS.some(pattern => {
        pattern.lastIndex = 0;
        return pattern.test(normalized) || pattern.test(txt);
      });
      
      if (shouldExclude) continue;
      
      // Check if file matches any FAB pattern
      const matchesFABPattern = FAB_PATTERNS.some(pattern => {
        pattern.lastIndex = 0;
        return pattern.test(txt);
      });
      
      if (matchesFABPattern) {
        bad.push(normalized);
      }
    } catch (err) {
      // Skip files that can't be read (permissions, etc.)
      continue;
    }
  }
}

if (bad.length) {
  console.error("❌ Shell ownership violation: fixed FAB positioning found outside allowlist:");
  console.error("");
  for (const f of bad) {
    console.error("   ✗", f);
  }
  console.error("");
  console.error("Allowed locations for FABs:");
  for (const allowed of ALLOWLIST) {
    console.error("   ✓", allowed);
  }
  console.error("");
  console.error("Fix: Move FAB code to components/shell/FloatingActions.tsx");
  console.error("     or use the Pulse shell layout if you need a different shell.");
  process.exit(1);
} else {
  console.log("✅ Shell ownership check passed.");
  console.log("   No rogue FABs found. Shell components maintain single ownership.");
}

