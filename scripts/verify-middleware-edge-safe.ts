import fs from "fs";

const middlewarePath = fs.existsSync("src/middleware.ts")
    ? "src/middleware.ts"
    : "middleware.ts";

const content = fs.readFileSync(middlewarePath, "utf8");

const forbidden = [
    "fs",
    "path",
    "process.cwd",
    "scripts/",
    "verify-",
];

const violations = forbidden.filter((f) => content.includes(f));

if (violations.length) {
    console.error("❌ Middleware is not Edge-safe.");
    console.error("Forbidden patterns found:");
    violations.forEach(v => console.error("  -", v));
    process.exit(1);
}

console.log("✅ Middleware is Edge-safe.");
