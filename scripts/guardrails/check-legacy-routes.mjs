import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '../../');
const FORBIDDEN_PATTERNS = [
    '/dashboard',
    '/today',
    // Future expansion: '/journal', '/schedule', '/projects', '/tasks', '/people'
];

// Directories/Files to ignore or allow
const ALLOWED_FILES = [
    'middleware.ts',
    'scripts/guardrails/check-legacy-routes.mjs',
];

const IGNORED_DIRS = [
    '.git',
    '.next',
    'node_modules',
    'dist',
    'build'
];

let failure = false;

function scanFile(filePath) {
    const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');

    // Check allowlist
    if (ALLOWED_FILES.includes(relativePath)) {
        return;
    }

    try {
        const content = fs.readFileSync(filePath, 'utf8');

        FORBIDDEN_PATTERNS.forEach(pattern => {
            // Simple string search. 
            // We look for the pattern surrounded by quotes to be more specific to strings, 
            // but catching it anywhere is safer for a guardrail.
            // However, we want to avoid false positives like comments if possible, but for D3 strictness, simple is better.
            // Actually, let's just search for the string literal.

            if (content.includes(`"${pattern}"`) || content.includes(`'${pattern}'`) || content.includes(`\`${pattern}\``)) {
                console.error(`❌ Found forbidden route "${pattern}" in file: ${relativePath}`);
                failure = true;
            }
        });

    } catch (err) {
        console.warn(`Could not read file ${relativePath}:`, err.message);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const relativePath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');

        // Check directory ignore list
        if (IGNORED_DIRS.some(ignored => relativePath.startsWith(ignored))) {
            return;
        }

        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else {
            // Only check source files
            if (['.ts', '.tsx', '.js', '.mjs', '.jsx'].includes(path.extname(file))) {
                scanFile(fullPath);
            }
        }
    });
}

console.log('🔒 Guardrails: Checking for deprecated legacy routes...');
walkDir(ROOT_DIR);

if (failure) {
    console.log('\nFAILED: Found deprecated route references outside of allowed areas.');
    process.exit(1);
} else {
    console.log('✅ Guardrails passed.');
    process.exit(0);
}
