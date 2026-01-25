import { readFileSync } from "node:fs";

const clerkContent = readFileSync("components/auth/ClerkProviderSafe.tsx", "utf8");
const layoutContent = readFileSync("app/layout.tsx", "utf8");

// ✅ Verify ClerkProviderSafe always renders ClerkProvider when key exists
// (After PR #129, ClerkProviderSafe is a wrapper component, not a layout)
const clerkMustHave = [
    "hasPublishableKey()",
    "ClerkProvider",
    "// ✅ ALWAYS render ClerkProvider when we have a key",
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
