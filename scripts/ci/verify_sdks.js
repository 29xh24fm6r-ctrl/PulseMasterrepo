const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const ALLOW_OPENAI = path.normalize('services/ai/openai.ts');
const ALLOW_RESEND = path.normalize('services/email/resend.ts');

const FORBIDDEN_OPENAI_IMPORT = /from\s+['"]openai['"]/;
const FORBIDDEN_OPENAI_CTOR = /new\s+OpenAI\b\s*\(/;
const FORBIDDEN_RESEND_IMPORT = /from\s+['"]resend['"]/;
const FORBIDDEN_RESEND_CTOR = /new\s+Resend\b\s*\(/;

let fail = false;

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        if (f === 'node_modules' || f === '.next' || f === '.git' || f === 'dist') continue;
        const fullPath = path.join(dir, f);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walk(fullPath);
        } else if (f.endsWith('.ts') || f.endsWith('.tsx')) {
            checkFile(fullPath);
        }
    }
}

function checkFile(filePath) {
    const relPath = path.relative(ROOT, filePath);
    // Normalize slashes for comparison
    const normPath = relPath.split(path.sep).join('/');

    // Whitelists (allow partial matches if needed, but strict is better)
    // We compare normalized paths
    if (normPath === 'services/ai/openai.ts') return;
    if (normPath === 'services/email/resend.ts') return;

    const content = fs.readFileSync(filePath, 'utf8');

    if (FORBIDDEN_OPENAI_IMPORT.test(content)) {
        console.error(`❌ Forbidden OpenAI SDK import: ${relPath}`);
        fail = true;
    }
    if (FORBIDDEN_OPENAI_CTOR.test(content)) {
        console.error(`❌ Forbidden OpenAI constructor: ${relPath}`);
        fail = true;
    }
    if (FORBIDDEN_RESEND_IMPORT.test(content)) {
        console.error(`❌ Forbidden Resend SDK import: ${relPath}`);
        fail = true;
    }
    if (FORBIDDEN_RESEND_CTOR.test(content)) {
        console.error(`❌ Forbidden Resend constructor: ${relPath}`);
        fail = true;
    }
}

console.log("Verifying SDK usage...");
walk(ROOT);

if (fail) {
    console.error("\nCI Gate failed: SDK constructors/imports must be centralized in factories.");
    process.exit(1);
} else {
    console.log("✅ CI Gate passed");
    process.exit(0);
}
