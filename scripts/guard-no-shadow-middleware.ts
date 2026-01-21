import fs from "fs";
import path from "path";

const forbidden = [
    "app/middleware.ts",
    "app/middleware.tsx",
    "src/app/middleware.ts",
    "src/app/middleware.tsx",
];

const root = process.cwd();
const found = forbidden.filter((p) => fs.existsSync(path.join(root, p)));

if (found.length) {
    console.error("❌ Shadow middleware files detected.");
    console.error("Next.js ONLY executes root or src-level middleware.");
    console.error("Remove these files:");
    found.forEach((f) => console.error("  - " + f));
    process.exit(1);
}

console.log("✅ No shadow middleware files detected.");
