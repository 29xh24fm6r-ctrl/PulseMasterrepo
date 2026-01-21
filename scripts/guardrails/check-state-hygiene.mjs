import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '../../');

const FORBIDDEN_TOKENS = [
    'setBannerActive'
];

// Directories/Files to ignore or allow
const ALLOWED_FILES = [
    'components/shell/overlays/OverlayContext.tsx',
    'scripts/guardrails/check-state-hygiene.mjs', // Self
];

const IGNORED_DIRS = [
    '.git',
    '.next',
    'node_modules',
    'dist',
    'build',
    '.gemini' // Ignore AI brain
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

        FORBIDDEN_TOKENS.forEach(token => {
            // Simple string search.
            if (content.includes(token)) {
                console.error(`❌ Found forbidden token "${token}" in file: ${relativePath}`);
                console.error(`   -> Solution: Use OverlayContext methods (showBanner/hideBanner) instead.`);
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

console.log('🔒 Guardrails: Checking for runtime state hygiene (setBannerActive)...');
walkDir(ROOT_DIR);

if (failure) {
    console.log('\nFAILED: Found usage of setBannerActive outside OverlayContext.');
    process.exit(1);
} else {
    console.log('✅ hygiene check passed.');
    process.exit(0);
}
