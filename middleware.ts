import { NextResponse, type NextRequest, NextFetchEvent } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

const PROTECTED_PREFIXES = [
  "/app",
  "/dashboard",
  "/bridge",
  "/settings",
  "/voice",
  "/today",
  "/inbox",
  "/memories",
  "/skills",
  // Add other protected app routes here
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function hasClerkKeys(): boolean {
  return !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;
}

function getHostname(req: NextRequest): string {
  const host = req.headers.get("host") || "";
  // host may include port locally; strip it.
  return host.split(":")[0];
}

function isPreviewHost(hostname: string): boolean {
  return hostname.endsWith(".vercel.app");
}

function isAlwaysPublic(pathname: string): boolean {
  if (pathname === "/auth-disabled") return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/manifest.json") return true;
  if (pathname === "/site.webmanifest") return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/api/dev")) return true; // Keep dev bootstrap open
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) return true;
  if (pathname === "/") return true; // Landing page
  return false;
}

function stamp(res: NextResponse, tags: string | string[]) {
  const v = Array.isArray(tags) ? tags.join(",") : tags;
  res.headers.set("x-pulse-mw", v);
  return res;
}

export function middleware(req: NextRequest, evt: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  // 1) Always allow static/public essentials
  if (isAlwaysPublic(pathname)) {
    return stamp(NextResponse.next(), "allow_public_asset");
  }

  const hostname = getHostname(req);

  // 2) Bridge / Dev Bypass Logic - Preserve verify bypass
  if (pathname === "/bridge") {
    const isVerify = req.headers.get("x-pulse-verify") === "true";
    if (isVerify) {
      return stamp(NextResponse.json({ status: "ok", mode: "bypass" }), ["allow_dev_bypass", "allow_auth"]);
    }
  }

  // 3) HARD LOCK: Preview domains never run Clerk, even if someone mis-scoped env vars
  // Also check if keys are missing.
  if (isPreviewHost(hostname) || !hasClerkKeys()) {
    if (isProtectedPath(pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = "/auth-disabled";
      return stamp(NextResponse.rewrite(url), "rewrite_auth_disabled");
    }
    // Allow other non-protected routes to pass through (without auth)
    return stamp(NextResponse.next(), "public_no_auth");
  }

  // 4) Auth enabled on canonical (non-preview) hosts: run Clerk normally
  return clerkMiddleware(async (auth, req) => {
    // Hard Redirects (Legacy)
    if (pathname === "/dashboard" || pathname === "/today") {
      return NextResponse.redirect(new URL("/bridge", req.url));
    }

    // Default protection
    await auth.protect();
    return stamp(NextResponse.next(), "protected_content");
  })(req, evt);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};