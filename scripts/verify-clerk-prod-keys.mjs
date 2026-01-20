// scripts/verify-clerk-prod-keys.mjs
const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

console.log("Verifying Clerk Keys...");
console.log(`Environment: ${process.env.VERCEL_ENV || process.env.NODE_ENV}`);

if (!key) {
    console.warn("WARNING: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing.");
    // We don't fail hard if key is missing in build unless we know we need it, 
    // but usually this is bad. For now, just warn.
    process.exit(0);
}

if (isProd) {
    if (key.startsWith("pk_test_")) {
        console.error("❌ CRTICAL FAILURE: Development Clerk Keys detected in Production Environment!");
        console.error("Please update NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in Vercel to the Live key (starts with pk_live_).");
        process.exit(1);
    } else if (key.startsWith("pk_live_")) {
        console.log("✅ Success: Live Clerk Key detected.");
    } else {
        console.warn(`⚠️ Warning: Unknown Clerk Key format: ${key.substring(0, 8)}...`);
    }
} else {
    console.log("Non-production environment; skipping strict key check.");
}
