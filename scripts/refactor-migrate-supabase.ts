
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

async function main() {
    const files = await glob(['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}', 'services/**/*.{ts,tsx}'], {
        ignore: ['lib/runtime/**', 'lib/supabase/**', 'scripts/**', 'services/voice-gateway/**']
    });

    console.log(`Found ${files.length} files to scan.`);

    let modifiedCount = 0;

    for (const file of files) {
        const fullPath = path.resolve(file);
        let content = fs.readFileSync(fullPath, 'utf-8');
        let modified = false;

        // 1. Check for legacy imports
        if (content.match(/import\s*{[^}]*supabaseAdmin[^}]*}\s*from\s*"@\/lib\/supabase(\/admin)?"/)) {
            // Replace import
            content = content.replace(
                /import\s*{[^}]*supabaseAdmin[^}]*}\s*from\s*"@\/lib\/supabase(\/admin)?"\s*;?/g,
                'import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";'
            );
            // Replace usage: supabaseAdmin -> getSupabaseAdminRuntimeClient()
            // Be careful not to replace inside the import line we just added (though we replaced it entirely)
            // But we might have other usages.
            // Heuristic: Replace "supabaseAdmin" with "getSupabaseAdminRuntimeClient()" unless it's followed by nothing (end of symbol).
            // Actually, simply replacing 'supabaseAdmin' with 'getSupabaseAdminRuntimeClient()' is safe IF we handle the import correctly.
            // But wait, "supabaseAdmin" might be a property name? e.g. { supabaseAdmin: ... }
            // Unlikely in this codebase.
            // But usages like `const sb = supabaseAdmin;` -> `const sb = getSupabaseAdminRuntimeClient();`
            // `supabaseAdmin.from` -> `getSupabaseAdminRuntimeClient().from`
            // `(supabaseAdmin as any)` -> `(getSupabaseAdminRuntimeClient() as any)`
            // `const sb = supabaseAdmin()` -> `const sb = getSupabaseAdminRuntimeClient()()` -- WRONG.

            // To handle `supabaseAdmin()` pattern (legacy function call):
            // We should replace `supabaseAdmin()` with `getSupabaseAdminRuntimeClient()`.
            // And `supabaseAdmin` (variable) with `getSupabaseAdminRuntimeClient()`.

            // Regex strategy:
            // 1. Replace `supabaseAdmin\(\)` -> `getSupabaseAdminRuntimeClient()`
            content = content.replace(/supabaseAdmin\(\)/g, 'getSupabaseAdminRuntimeClient()');

            // 2. Replace remaining `supabaseAdmin` -> `getSupabaseAdminRuntimeClient()`.
            content = content.replace(/supabaseAdmin(?!\w)/g, 'getSupabaseAdminRuntimeClient()');

            // 3. Fix double call if it happened: `getSupabaseAdminRuntimeClient()()` -> `getSupabaseAdminRuntimeClient()` - likely not needed if we did order right.
            // Actually step 1 ensures `supabaseAdmin()` -> `getSupabaseAdminRuntimeClient()`.
            // Step 2 ensures `supabaseAdmin` -> `getSupabaseAdminRuntimeClient()`.
            // Wait, if I have `supabaseAdmin.from`, step 2 makes it `getSupabaseAdminRuntimeClient().from`. Correct.
            // If I have `const sb = supabaseAdmin;`, step 2 makes it `const sb = getSupabaseAdminRuntimeClient();`. Correct.

            modified = true;
        }

        if (content.match(/import\s*{[^}]*supabase[^}]*}\s*from\s*"@\/lib\/supabase"/)) {
            // Replace import
            // Note: Might have both supabase and supabaseAdmin in same file.
            // We need to handle that.

            // Simplification: Just replace `import { supabase } from ...`
            content = content.replace(
                /import\s*{[^}]*supabase[^}]*}\s*from\s*"@\/lib\/supabase"\s*;?/g,
                'import { getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";'
            );

            // Replace usage
            content = content.replace(/supabase(?!\w)(?!_)/g, 'getSupabaseRuntimeClient()');
            // Negative lookahead for _ to avoid replacing supabase_key etc if they exist?
            // "supabase" is a common word.
            // Better to only replace if it's likely the variable.
            // But strict replacement of the symbol `supabase` is what we want.

            modified = true;
        }

        // 2. Check for direct @supabase/supabase-js imports
        if (content.match(/import\s*{[^}]*createClient[^}]*}\s*from\s*"@supabase\/supabase-js"/)) {
            content = content.replace(
                /import\s*{[^}]*createClient[^}]*}\s*from\s*"@supabase\/supabase-js"\s*;?/g,
                'import { getSupabaseAdminRuntimeClient, getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";'
            );

            // Replace createClient(...)
            if (content.match(/createClient\s*\([^)]*SERVICE_ROLE_KEY[^)]*\)/)) {
                content = content.replace(/createClient\s*\([^)]*\)/g, 'getSupabaseAdminRuntimeClient()');
            } else {
                content = content.replace(/createClient\s*\([^)]*\)/g, 'getSupabaseRuntimeClient()');
            }
            modified = true;
        }

        // Fix up imports if we added multiple lines or messed up
        // If we have multiple imports from same file, we can merge them?
        // Or just leave them, TS doesn't care.

        if (modified) {
            fs.writeFileSync(fullPath, content);
            modifiedCount++;
            console.log(`Updated ${file}`);
        }
    }

    console.log(`Refactor complete. Modified ${modifiedCount} files.`);
}

main().catch(console.error);
