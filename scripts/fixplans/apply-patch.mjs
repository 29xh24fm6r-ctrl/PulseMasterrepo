// scripts/fixplans/apply-patch.mjs
import path from "node:path";
import fs from "node:fs";
import { die, readJson, extractPatchFromFixplanJson, applyPatch } from "./_patchlib.mjs";

function parseArgs(argv) {
  const args = { file: null, dryRun: false, allowDelete: false, force: false };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!args.file && !a.startsWith("--")) args.file = a;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--allow-delete") args.allowDelete = true;
    else if (a === "--force") args.force = true;
    else die(`Unknown arg: ${a}`);
  }

  if (!args.file) {
    die("Usage: node scripts/fixplans/apply-patch.mjs <fixplan.json> [--dry-run] [--allow-delete] [--force]");
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const fp = path.resolve(process.cwd(), args.file);

  if (!fs.existsSync(fp)) {
    die(`File not found: ${fp}`);
  }

  const json = readJson(fp);

  const patch = extractPatchFromFixplanJson(json);
  if (!patch) die("No patch_json found in fixplan JSON. Export a plan that includes patch_json.");

  console.log("\n✅ Patch loaded.");
  if (patch.summary) console.log(`Summary: ${patch.summary}`);

  const res = applyPatch(patch, {
    dryRun: args.dryRun,
    allowDelete: args.allowDelete,
    force: args.force,
  });

  console.log("\nPlanned operations:");
  for (const p of res.planned) console.log(`- ${String(p.op).padEnd(6)} ${p.rel}${p.note ? `  (${p.note})` : ""}`);

  if (args.dryRun) {
    console.log("\n🟦 DRY RUN: no files written.\n");
    return;
  }

  console.log("\n✅ Patch applied.");
  if (res.backups.length) console.log(`Backups created: ${res.backups.length} (*.bak)`);
  console.log("\nNext: npm run build\n");
}

main();
