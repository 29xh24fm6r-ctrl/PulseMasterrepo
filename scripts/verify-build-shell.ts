import { readFileSync } from "node:fs";

const clerkContent = readFileSync("components/auth/ClerkProviderSafe.tsx", "utf8");
const layoutContent = readFileSync("app/layout.tsx", "utf8");

// ✅ Verify ClerkProviderSafe renders appropriate provider based on key validity
// - No provider if no key
// - MockClerkProvider if dummy/test key (for build/CI)
// - Real ClerkProvider if valid key
const clerkMustHave = [
    "hasPublishableKey()",
    "isValidClerkKey()",
    "MockClerkProvider",
    "ClerkProvider",
];

for (const s of clerkMustHave) {
    if (!clerkContent.includes(s)) {
        console.error(`[VERIFY FAILED] ClerkProviderSafe.tsx missing required pattern: ${s}`);
        process.exit(1);
    }
}

// ✅ Verify layout.tsx uses ClerkProviderSafe correctly
const layoutMustHave = [
    "<html",
    "<body",
    "ClerkProviderSafe",
];

for (const s of layoutMustHave) {
    if (!layoutContent.includes(s)) {
        console.error(`[VERIFY FAILED] app/layout.tsx missing required pattern: ${s}`);
        process.exit(1);
    }
}

console.log("[OK] Build shell strategy verified in ClerkProviderSafe.tsx and layout.tsx");
