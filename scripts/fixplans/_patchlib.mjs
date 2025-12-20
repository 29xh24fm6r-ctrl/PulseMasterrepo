// scripts/fixplans/_patchlib.mjs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

export function readJson(fp) {
  try {
    return JSON.parse(fs.readFileSync(fp, "utf8"));
  } catch {
    die(`Failed to read JSON: ${fp}`);
  }
}

export function sha256OfFile(fp) {
  const buf = fs.readFileSync(fp);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function sha256OfString(s) {
  return crypto.createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");
}

export function normalizeRel(p) {
  const rel = String(p || "").replaceAll("\\", "/").replace(/^\/+/, "");
  if (!rel) die("Empty path");
  if (rel.includes("..")) die(`Path traversal not allowed: ${p}`);
  return rel;
}

export function defaultPolicy() {
  return {
    allowPrefixes: [
      "src/",
      "app/",
      "components/",
      "lib/",
      "scripts/",
      "supabase/migrations/",
      "public/",
      "docs/",
    ],
    denyPrefixes: [
      ".git/",
      "node_modules/",
      ".next/",
      "dist/",
      "build/",
      "coverage/",
      ".vercel/",
      ".env",
      ".env.",
    ],
    maxFileBytes: 300_000,
    maxOps: 50,
  };
}

export function allowedPath(rel, policy) {
  if (policy.denyPrefixes.some((d) => rel === d || rel.startsWith(d))) return false;
  if (rel.startsWith(".env")) return false;
  return policy.allowPrefixes.some((a) => rel === a || rel.startsWith(a));
}

export function validatePatchJson(patch, policy) {
  if (!patch || typeof patch !== "object") die("patch_json missing or invalid");
  if (patch.version !== "patch.v1") die(`Unsupported patch version: ${patch.version}`);
  if (!Array.isArray(patch.ops) || patch.ops.length < 1) die("patch.ops must be a non-empty array");
  if (patch.ops.length > policy.maxOps) die(`Too many ops: ${patch.ops.length} > ${policy.maxOps}`);

  for (const op of patch.ops) {
    if (!op || typeof op !== "object") die("Invalid op object");
    if (op.op !== "upsert" && op.op !== "delete") die(`Invalid op.op: ${op.op}`);
    if (typeof op.path !== "string" || !op.path.trim()) die("op.path required");
    if (op.op === "upsert") {
      if (typeof op.content !== "string") die(`upsert op missing content for ${op.path}`);
      if (op.content.includes("\u0000")) die(`Unsafe content (null byte) in ${op.path}`);
      if (Buffer.byteLength(op.content, "utf8") > policy.maxFileBytes) die(`File too large: ${op.path}`);
    }
    if (op.expected_sha256 && typeof op.expected_sha256 !== "string") die(`expected_sha256 must be string: ${op.path}`);
  }
}

export function extractPatchFromFixplanJson(json) {
  return json.patch_json ?? json.plan?.patch_json ?? null;
}

export function backupFile(abs) {
  if (!fs.existsSync(abs)) return null;
  const bak = `${abs}.bak`;
  fs.copyFileSync(abs, bak);
  return bak;
}

export function ensureDir(abs) {
  const dir = path.dirname(abs);
  fs.mkdirSync(dir, { recursive: true });
}

export function applyPatch(patch, opts) {
  const policy = opts.policy ?? defaultPolicy();
  validatePatchJson(patch, policy);

  const planned = [];
  for (const op of patch.ops) {
    const rel = normalizeRel(op.path);
    if (!allowedPath(rel, policy)) die(`Path not allowed by policy: ${rel}`);
    planned.push({ ...op, rel, abs: path.resolve(process.cwd(), rel) });
  }

  const deletes = planned.filter((p) => p.op === "delete").length;
  if (deletes > 0 && !opts.allowDelete) {
    die(`Patch includes ${deletes} delete ops. Re-run with --allow-delete if you intend that.`);
  }

  if (opts.dryRun) {
    return { planned, backups: [], wrote: [] };
  }

  const backups = [];
  const wrote = [];

  for (const p of planned) {
    if (p.op === "delete") {
      if (fs.existsSync(p.abs)) {
        const bak = backupFile(p.abs);
        if (bak) backups.push(bak);
        fs.rmSync(p.abs);
        wrote.push({ op: "delete", rel: p.rel });
      }
      continue;
    }

    // upsert
    if (fs.existsSync(p.abs) && p.expected_sha256 && !opts.force) {
      const current = sha256OfFile(p.abs);
      if (current !== p.expected_sha256) {
        die(`Hash mismatch for ${p.rel}\nExpected: ${p.expected_sha256}\nActual:   ${current}\nUse --force to override.`);
      }
    }

    ensureDir(p.abs);
    const bak = backupFile(p.abs);
    if (bak) backups.push(bak);

    fs.writeFileSync(p.abs, p.content, "utf8");
    wrote.push({ op: "upsert", rel: p.rel, sha256: sha256OfString(p.content) });
  }

  return { planned, backups, wrote };
}

