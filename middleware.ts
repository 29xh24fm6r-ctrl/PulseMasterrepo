import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;
  const isDevOrPreview = process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV !== 'production';

  // Helper to safely set headers only in dev/preview
  const setDebugHeader = (res: NextResponse, value: string) => {
    if (isDevOrPreview) {
      res.headers.set("X-Pulse-MW", value);
    }
  };

  // 1) Fix Middleware: MUST Allow Next.js Internals + Public Files
  // Antigravity MUST ensure these paths are never auth-checked, redirected, or rewritten:
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

  // 2) Preview/Dev: Hard Bypass Auth If Dev Owner Env Var Is Present AND Explicitly Enabled
  // Double-gate safety: Requires BOTH the User ID AND the Enable Flag.
  const devOwner = process.env.NEXT_PUBLIC_DEV_PULSE_OWNER_USER_ID;
  const devBypassEnabled = process.env.PULSE_ENABLE_DEV_BYPASS === 'true';

  if (devOwner && devBypassEnabled) {
    const res = NextResponse.next();
    setDebugHeader(res, "allow_dev_bypass");
    return res;
  }

  // 3) Ensure /sign-in is Public and Real
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) {
    const res = NextResponse.next();
    setDebugHeader(res, "allow_auth");
    return res;
  }

  // 4) API Must Stay Excluded (Reconfirm)
  if (pathname.startsWith("/api")) {
    const res = NextResponse.next();
    setDebugHeader(res, "allow_api");
    return res;
  }

  // Phase D1: Hard Redirect Enforcement (Legacy Routes)
  // Preserving critical redirects
  if (pathname === '/dashboard' || pathname === '/today') {
    return NextResponse.redirect(new URL('/bridge', req.url));
  }

  // Default Auth Gate
  // If we reached here, it's a protected route (e.g. /bridge) and we are NOT in dev bypass mode.
  await auth.protect();

  const res = NextResponse.next();
  setDebugHeader(res, "protected_content");
  return res;
})

export const config = {
  // 4) API Must Stay Excluded (Reconfirm) - config matcher
  matcher: ["/((?!api).*)"],
};