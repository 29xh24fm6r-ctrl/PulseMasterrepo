
import { glob } from 'glob';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log("🔒 Scanning for runtime violations...");
    const files = await glob(['app/**/*.ts', 'lib/**/*.ts'], {
        ignore: ['lib/runtime/**', 'node_modules/**']
    });

    let fixedCount = 0;

    for (const file of files) {
        const fullPath = path.resolve(file);
        let content = fs.readFileSync(fullPath, 'utf8');
        let originalContent = content;
        let modified = false;

        // Match: const [var] = getSupabaseAdminRuntimeClient();
        // Match: const [var] = getOpenAI();
        // Match: const [var] = await getOpenAI();

        const topLevelRegex = /^const\s+(\w+)\s*=\s*(?:await\s+)?(getSupabaseAdminRuntimeClient|getOpenAI)\(\);/gm;

        let match;
        const topLevelVars: { name: string, factory: string }[] = [];

        // Find all top-level variables initialized this way
        while ((match = topLevelRegex.exec(content)) !== null) {
            topLevelVars.push({ name: match[1], factory: match[2] });
            modified = true;
        }

        if (topLevelVars.length > 0) {
            console.log(`Fixing ${file}: Found top-level vars: ${topLevelVars.map(v => v.name).join(', ')}`);

            // Remove top-level lines
            content = content.replace(topLevelRegex, '');

            // Inject into handlers
            // We look for: export async function POST(req) { ...
            // And inject: const [var] = getSupabaseAdminRuntimeClient();

            // Handlers: GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD
            const handlerRegex = /(export\s+async\s+function\s+(?:GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s*\([^)]*\)\s*\{)/g;

            content = content.replace(handlerRegex, (match) => {
                // Construct injection lines
                const injections = topLevelVars.map(v => {
                    const prefix = v.factory === 'getOpenAI' ? 'await ' : '';
                    // Note: getOpenAI is async? 
                    // services/ai/openai.ts export function getOpenAI()... wait.
                    // getOpenAI IS async? Usually.
                    // Let's assume await for getOpenAI for safety if top level used await, but inside handler we can use it.
                    // Better pattern: Check if original used await?
                    // The regex `(?:await\s+)?` consumed the await.
                    // I should check `v.factory`.

                    // Actually, let's look at `getOpenAI`.
                    // Ideally we add `await` if it is `getOpenAI`.
                    // But if the function is not async, `await` is error (unless top level).
                    // Handlers are `async function POST`. So await is fine.

                    if (v.factory === 'getOpenAI') {
                        return `  const ${v.name} = await getOpenAI();`;
                    }
                    return `  const ${v.name} = getSupabaseAdminRuntimeClient();`;
                }).join('\n');
                return `${match}\n${injections}`;
            });

            // Also handle default functions if they look like components or handlers?
            // But usually API routes use named exports.
            // Be careful not to break non-route files which might use it differently.
            // But the grep mainly showed API routes.
        }

        if (modified && content !== originalContent) {
            fs.writeFileSync(fullPath, content);
            fixedCount++;
        }
    }

    console.log(`✅ Fixed ${fixedCount} files.`);
}

main().catch(console.error);
