import fs from "fs";
import path from "path";

function exists(p: string) {
    try {
        return fs.existsSync(p);
    } catch {
        return false;
    }
}

const repoRoot = process.cwd();

const hasSrcApp = exists(path.join(repoRoot, "src", "app"));
const expected = hasSrcApp
    ? path.join(repoRoot, "src", "middleware.ts")
    : path.join(repoRoot, "middleware.ts");

const alt1 = path.join(repoRoot, "middleware.ts");
const alt2 = path.join(repoRoot, "src", "middleware.ts");

const expectedExists = exists(expected);

if (!expectedExists) {
    console.error(`❌ Middleware missing at expected path:\n  ${expected}`);
    console.error(
        `\nDetected layout: ${hasSrcApp ? "src/app" : "root/app"}\n` +
        `Fix: create the middleware at the expected path and remove duplicates.`
    );
    process.exit(1);
}

// Guard against duplicates (causes confusion/regressions)
const duplicates =
    (expected !== alt1 && exists(alt1)) || (expected !== alt2 && exists(alt2));

if (duplicates) {
    console.error(`❌ Multiple middleware files detected.`);
    console.error(`Expected only:\n  ${expected}`);
    console.error(
        `Found also:\n  ${expected !== alt1 && exists(alt1) ? "  " + alt1 + "\n" : ""}` +
        `${expected !== alt2 && exists(alt2) ? "  " + alt2 + "\n" : ""}`
    );
    console.error(`Fix: keep only the expected middleware file.`);
    process.exit(1);
}

console.log(`✅ Middleware location verified:\n  ${expected}`);
