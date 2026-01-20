// scripts/verify-no-clerk-prod-in-preview.mjs
// Fails if a production Clerk key appears in a preview-like environment.
// This is a best-effort local/CI guard (Vercel env scoping is still the real enforcement).

const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
const sk = process.env.CLERK_SECRET_KEY || "";
// Normalize Vercel Env or NODE_ENV
const vercelEnv = process.env.VERCEL_ENV || "";
const nodeEnv = process.env.NODE_ENV || "";
const isPreview = vercelEnv === "preview";

function isProdKey(value) {
    return value && (value.startsWith("pk_live_") || value.startsWith("sk_live_"));
}

console.log("🔒 Verifying Clerk Key Safety...");
console.log(`Debug Context: VERCEL_ENV=${vercelEnv}, NODE_ENV=${nodeEnv}`);

if (isPreview) {
    if (isProdKey(pk)) {
        console.error("❌ CRITICAL FAILURE: Production Clerk PK detected in Preview Environment!");
        console.error("   Value:", pk.substring(0, 10) + "...");
        process.exit(1);
    }
    if (isProdKey(sk)) {
        console.error("❌ CRITICAL FAILURE: Production Clerk Secret detected in Preview Environment!");
        process.exit(1);
    }
    console.log("✅ Success: Preview environment is safe (no live keys).");
} else {
    // Not preview - just log info
    if (isProdKey(pk)) {
        console.log("ℹ️  Info: Live key detected (Allowed for this unknown/prod environment).");
    } else {
        console.log("ℹ️  Info: No live keys detected.");
    }
}

process.exit(0);
