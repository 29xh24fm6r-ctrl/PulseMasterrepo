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
  if (!isPublicRoute(request)) {
    await auth.protect()
  }

  const res = NextResponse.next();
  const pathname = request.nextUrl.pathname;

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
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)|monitoring).*)',
    '/(api|trpc)(.*)',
  ],
}