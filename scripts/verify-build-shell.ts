import { readFileSync } from "node:fs";

const content = readFileSync("components/auth/ClerkProviderSafe.tsx", "utf8");

const mustHave = [
    "phase-production-build",
    "<html",
    "<body",
];

for (const s of mustHave) {
    if (!content.includes(s)) {
        console.error(`[VERIFY FAILED] ClerkProviderSafe.tsx missing required build-shell token: ${s}`);
        process.exit(1);
    }
}

console.log("[OK] Build shell strategy present in ClerkProviderSafe.tsx");
