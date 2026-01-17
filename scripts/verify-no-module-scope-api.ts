
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Configuration
const API_DIR = 'app/api';
const FORBIDDEN_PATTERNS = [
    {
        regex: /createClient\(/,
        message: 'Supabase createClient called at module scope',
        allowInsideFunction: true
    },
    {
        regex: /new OpenAI/,
        message: 'OpenAI client initialized at module scope',
        allowInsideFunction: true
    },
    {
        regex: /process\.env/,
        message: 'process.env accessed at module scope (move to handler)',
        allowInsideFunction: true
    },
    {
        regex: /mustGetEnv/,
        message: 'mustGetEnv called at module scope (throws if missing)',
        allowInsideFunction: true
    }
];

// Helper to check if a match is inside a function or class method
// This is a naive check: looks for "export async function", "export default async function", "function ", "class " before the match
// A real AST parser would be better, but this catches the obvious "top of file" violations.
function isAtModuleScope(content: string, matchIndex: number): boolean {
    const codeBefore = content.substring(0, matchIndex);

    // Heuristic: If we are not inside a brace block that started after a function declaration...
    // Actually, simpler heuristic for "module scope":
    // It is at module scope if it is NOT inside a generic function block.
    // Detecting "inside function" with regex is hard.
    // Let's rely on line-based heuristic: 
    // If we see "export async function" or "export default function" BEFORE this line, we *might* be safe, 
    // but we could be in another handler.

    // Better approach for this script:
    // Just flag it if it's not seemingly inside a function.
    // We can look for open braces count.

    let openBraces = 0;
    let closeBraces = 0;

    // Naive brace counting from start of file
    // This fails formatting but works for typical code.
    for (const char of codeBefore) {
        if (char === '{') openBraces++;
        if (char === '}') closeBraces++;
    }

    // If braces are balanced-ish (0 depth), it's module scope.
    // Note: imports use braces. "import { x } from y" -> balanced.
    // So 0 depth is likely module scope.
    // But inside `const x = { ... }` is also depth 1.

    // Let's try a strict line-scan approach.
    // If the line containing the error is NOT indented, it's definitely module scope.
    // If it IS indented, it might be inside a function or a module-scope object.
    // BUT the architecture rule is "Create inside handler".
    // So even `const x = { client: createClient() }` is BAD.

    return openBraces === closeBraces;
}

async function verify() {
    const files = await glob(`${API_DIR}/**/route.{ts,tsx}`, { ignore: 'node_modules/**' });
    let failureRequest = false;

    console.log(`Scanning ${files.length} API routes for module-scope hazards...`);

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        let fileHasError = false;

        lines.forEach((line, index) => {
            // Strip comments for basic checking
            const cleanLine = line.replace(/\/\/.*$/, '');

            FORBIDDEN_PATTERNS.forEach(pattern => {
                if (pattern.regex.test(cleanLine)) {
                    // Check if likely module scope
                    // 1. Is it inside a function?
                    // We'll assume if it's "const x =" at root level (indent 0) it is bad.
                    // If it is indented, we need to check if it's inside an export function.

                    // Super strict mode for Canon Gate:
                    // Any usage of these patterns MUST be inside a function scope.
                    // We can't easily prove function scope without AST.
                    // But we can check if the file has `export function` or `export const POST/GET` 
                    // and if this line appears BEFORE (or outside) them.

                    // Let's use a simplified logical check:
                    // If the line starts with `const` or `let` or `var` and has 0 indentation, FAIL.

                    const isRootLevel = !line.startsWith(' ') && !line.startsWith('\t');

                    if (isRootLevel && (line.includes('const ') || line.includes('let ') || line.includes('var ') || line.includes('new '))) {
                        console.error(`[FAIL] ${file}:${index + 1}: ${pattern.message}`);
                        console.error(`       Line: ${line.trim()}`);
                        fileHasError = true;
                        failureRequest = true;
                    }

                    // Special check for `process.env` which is often allowed in config but disallowed in "logic"
                    // If it's assigning to a root const, it fails.
                    // e.g. `const API_KEY = process.env.KEY` -> FAIL (should be inside handler)
                }
            });
        });
    }

    if (failureRequest) {
        console.error("\n❌ Verification Failed: Module-scope execution detected.");
        process.exit(1);
    } else {
        console.log("\n✅ Verification Passed: No obvious module-scope hazards found.");
    }
}

verify().catch(console.error);
