
import fs from 'fs';
import path from 'path';

/**
 * Canon Verification: No Bypass
 * =============================
 * 
 * Ensures that "Thinking" layers (Brain, Memory) do NOT import "Doing" layers (Execution, Actions).
 * This guarantees that the brain cannot trigger side effects directly.
 */

const FORBIDDEN_IMPORTS = [
    'lib/execution',
    'app/api/tasks/action',
    'lib/actions',
    'child_process'
];

const THINKING_DIRS = [
    'lib/brain',
    'lib/memory',
    'lib/identity'
];

function scanDirectory(dir: string) {
    const files = fs.readdirSync(dir);
    let violations = 0;

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            violations += scanDirectory(fullPath);
        } else if (file.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            for (const forbidden of FORBIDDEN_IMPORTS) {
                if (content.includes(forbidden)) {
                    console.error(`❌ VIOLATION in ${fullPath}: Imports '${forbidden}'`);
                    violations++;
                }
            }
        }
    }
    return violations;
}

function verifyNoBypass() {
    console.log("🛡️ Starting Canon Verification: No Bypass...");

    let totalViolations = 0;
    const rootDir = process.cwd();

    for (const thinkingDir of THINKING_DIRS) {
        const target = path.join(rootDir, thinkingDir);
        if (fs.existsSync(target)) {
            console.log(`Scanning ${thinkingDir}...`);
            totalViolations += scanDirectory(target);
        }
    }

    if (totalViolations > 0) {
        console.error(`\n❌ FAILED: Found ${totalViolations} bypass violations.`);
        process.exit(1);
    } else {
        console.log("\n✅ SUCCESS: No execution bypasses found in thinking layers.");
    }
}

verifyNoBypass();
