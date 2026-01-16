import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getPulseEnv, isDevOrPreview } from "@/lib/env/pulseEnv";

const PUBLIC_FILE = /\.(.*)$/;

/**
 * PULSE MIDDLEWARE — AUTHORITY BOUNDARIES
 *
 * This middleware is the request-time gatekeeper for protected routes.
 *
 * Trust model:
 * 1) Public assets + Next internals are ALWAYS allowed (never auth-checked).
 * 2) /api routes are excluded from middleware auth (API routes enforce their own auth).
 * 3) Auth routes (/sign-in, /sign-up) are public.
 * 4) Dev/Preview bypass is explicitly gated and must be intentionally enabled.
 * 5) All remaining routes are protected via Clerk (auth.protect()).
 *
 * IMPORTANT:
 * - Do not add business logic here.
 * - Keep decisions explainable: "what do we trust and why?"
 */
export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;
  const pulseEnv = getPulseEnv();
  const devOrPreview = isDevOrPreview();

  // Helper to safely set debug headers only in dev/preview (never in prod)
  const setDebugHeader = (res: NextResponse, value: string) => {
    if (devOrPreview) res.headers.set("X-Pulse-MW", value);
  };

  // 1) ALWAYS ALLOW: Next internals + public files
  // Authority: path-based allowlist (no auth required, prevents accidental asset blocking)
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/images") ||
    PUBLIC_FILE.test(pathname)
  ) {
    const res = NextResponse.next();
    setDebugHeader(res, "allow_public_asset");
    return res;
  }

  // 2) ALWAYS ALLOW: auth pages must remain reachable without auth
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) {
    const res = NextResponse.next();
    setDebugHeader(res, "allow_auth_routes");
    return res;
  }

  // 3) ALWAYS ALLOW: API routes are excluded from middleware auth
  // Authority: API routes validate auth within the route handler layer
  if (pathname.startsWith("/api")) {
    const res = NextResponse.next();
    setDebugHeader(res, "allow_api");
    return res;
  }

  // 4) DEV/PREVIEW BYPASS (explicit)
  // Authority: must be intentionally enabled by env flag.
  // NOTE: This bypass is intentionally coarse: it bypasses Clerk protection in dev/preview.
  // If you want to bind bypass to a cookie presence, do it here and document it.
  const devBypassEnabled = process.env.PULSE_ENABLE_DEV_BYPASS === "true";

  // OPTIONAL (recommended): use server-only ID gate if available, else fallback.
  // This prevents relying on NEXT_PUBLIC_* for server decisions.
  const devOwnerId =
    process.env.PULSE_DEV_USER_ID || process.env.NEXT_PUBLIC_DEV_PULSE_OWNER_USER_ID;

  if (devOrPreview && devBypassEnabled && devOwnerId) {
    const res = NextResponse.next();
    setDebugHeader(res, `allow_dev_bypass:${pulseEnv}`);
    return res;
  }

  // Phase D1: Hard Redirect Enforcement (Legacy Routes)
  if (pathname === "/dashboard" || pathname === "/today") {
    return NextResponse.redirect(new URL("/bridge", req.url));
  }

  // 5) DEFAULT: Protected route (Clerk)
  await auth.protect();

  const res = NextResponse.next();
  setDebugHeader(res, "protected_content");
  return res;
});

export const config = {
  matcher: ["/((?!api).*)"],
};