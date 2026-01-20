// scripts/verify-clerk-prod-keys.mjs
const isProd = process.env.VERCEL_ENV === 'production';
const isPreview = process.env.VERCEL_ENV === 'preview';
const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

console.log("Verifying Clerk Keys...");
console.log(`Environment: ${process.env.VERCEL_ENV || process.env.NODE_ENV || 'local'}`);

if (!key) {
    console.warn("ℹ️ Info: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing/empty.");
    if (isProd) {
        console.error("❌ CRITICAL: Production environment MUST have Clerk keys!");
        process.exit(1);
    }
    console.log("✅ Success: No keys in non-prod (Auth Disabled).");
    process.exit(0);
}

// 1. Production Safety
if (isProd) {
    if (key.startsWith("pk_test_")) {
        console.error("❌ CRTICAL FAILURE: Development Clerk Keys detected in Production Environment!");
        console.error("Please update NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in Vercel to the Live key (starts with pk_live_).");
        process.exit(1);
    } else if (key.startsWith("pk_live_")) {
        console.log("✅ Success: Live Clerk Key detected in Production.");
    } else {
        console.warn(`⚠️ Warning: Unknown Clerk Key format: ${key.substring(0, 8)}...`);
    }
}
// 2. Preview Safety (Prevent Prod Key Leakage)
else if (isPreview) {
    if (key.startsWith("pk_live_")) {
        console.error("❌ SECURITY FAILURE: Production Clerk Key detected in Preview Environment!");
        console.error("Preview environments MUST NOT use production auth keys.");
        console.error("Action: Remove NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY from Vercel Preview environment.");
        process.exit(1);
    }
    console.log("✅ Success: Preview environment does not have live keys.");
} else {
    console.log("Local/Dev environment; skipping strict key check.");
}
