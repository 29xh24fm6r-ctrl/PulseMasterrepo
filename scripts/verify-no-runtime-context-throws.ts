// scripts/verify-no-runtime-context-throws.ts
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bad = "usePulseRuntime must be used within a PulseRuntimeProvider";

function walk(dir: string): string[] {
    const out: string[] = [];
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (ent.name === "node_modules" || ent.name === ".next" || ent.name === ".git") continue;
            out.push(...walk(p));
        } else if (ent.isFile()) {
            if (p.endsWith(".ts") || p.endsWith(".tsx") || p.endsWith(".js") || p.endsWith(".jsx")) out.push(p);
        }
    }
    return out;
}

const files = walk(root);
let found = 0;

for (const f of files) {
    const txt = fs.readFileSync(f, "utf8");
    // If strict hook exists, that's fine — but we want optional usage in shell surfaces if they are outside provider.
    // This script just ensures the message isn't duplicated or thrown from random places.
    // Actually, searching for the ERROR MESSAGE string is what the prompt asked for, 
    // to ensure nobody effectively re-implemented the strict check manually or copied it.

    if (txt.includes(bad) && !f.endsWith("PulseRuntimeProvider.tsx") && !f.endsWith("verify-no-runtime-context-throws.ts")) { // Note: File name matches my view_file result
        console.error(`Unexpected runtime provider throw message found in: ${f}`);
        found++;
    }
}

if (found) {
    console.error(`FAIL: Found ${found} files with unsafe runtime usage.`);
    process.exit(1);
}
console.log("OK: runtime throw message only exists in canonical context file.");
