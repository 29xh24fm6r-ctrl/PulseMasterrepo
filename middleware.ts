import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/comm(.*)',
  '/api/calls(.*)',
  '/api/sms(.*)',
  '/api/webhooks(.*)',
  '/api/voice(.*)', // Allow voice routes to handle their own auth (and dev bypass)
  '/api/pulse(.*)', // Allow pulse routes to handle their own auth (and dev bypass)
  '/api/stripe/webhook',
  '/api/health',
])

const TRACK_EXCLUDE_PREFIXES = [
  "/api",
  "/_next",
  "/favicon",
  "/assets",
  "/monitoring",
];

function shouldTrack(pathname: string) {
  if (!pathname || pathname === "/") return true;
  return !TRACK_EXCLUDE_PREFIXES.some((p) => pathname.startsWith(p));
}

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;

  // Directive 2: Mandatory Ordering & Allowlist
  if (pathname.startsWith("/api/dev/bootstrap")) return NextResponse.next();

  // Phase D1: Hard Redirect Enforcement (Legacy Routes)
  if (pathname === '/dashboard' || pathname === '/today') {
    return NextResponse.redirect(new URL('/bridge', request.url));
  }

  if (!isPublicRoute(request)) {
    // Phase F: Allow Dev Auth Bypass for Bridge
    // Directive 3.2: Check for Dev Cookie and allow pass-through if present.
    // This allows Preview environments (which run as prod) to use dev auth.
    const isDevBridge = process.env.NODE_ENV === 'development' && request.nextUrl.pathname.startsWith('/bridge');
    const hasDevCookie = request.cookies.get('x-pulse-dev-user-id')?.value;

    if (!isDevBridge && !hasDevCookie) {
      await auth.protect()
    }
  }

  const res = NextResponse.next();

  if (shouldTrack(pathname)) {
    // Fire-and-forget: do NOT slow the request
    // We construct absolute URL because fetch needs it
    const url = new URL("/api/activity/track", request.url);

    fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // forward auth cookies so the route can identify user
        cookie: request.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({ path: pathname }),
      cache: "no-store",
      keepalive: true,
    }).catch(() => { });
  }

  return res;
})

export const config = {
  matcher: [
    // Exclude /api routes entirely from middleware to prevent redirect loops or HTML responses
    '/((?!api|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)|monitoring).*)',
    '/((?!api|trpc).*)', // Safety fallback for tRPC pattern if used later
  ],
}