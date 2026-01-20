import { NextResponse, type NextRequest, NextFetchEvent } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { isPublicPath } from "@/lib/http/publicRoutes";

// Routes that DEFINITELY require Auth and would crash if Clerk is missing
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
  // Publishable is used client-side, secret is used server-side.
  // If either is missing, treat as "auth disabled" environment.
  return !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;
}

function stamp(res: NextResponse, tags: string | string[]) {
  const v = Array.isArray(tags) ? tags.join(",") : tags;
  res.headers.set("x-pulse-mw", v);
  return res;
}

export function middleware(req: NextRequest, evt: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  // 1) Public assets: ALWAYS allow
  if (isPublicPath(pathname)) {
    return stamp(NextResponse.next(), "allow_public_asset");
  }

  // CANON BYPASS: dev bootstrap
  if (pathname.startsWith("/api/dev")) {
    return NextResponse.next();
  }

  // 2) Bridge / Dev Bypass Logic
  if (pathname === "/bridge") {
    const isVerify = req.headers.get("x-pulse-verify") === "true";
    // Allow verification script to bypass auth even if keys exist
    if (isVerify) {
      return stamp(NextResponse.json({ status: "ok", mode: "bypass" }), ["allow_dev_bypass", "allow_auth"]);
    }
  }


  // 3) AUTH DISABLED GUARD (Preview / Missing Keys)
  // If keys are missing, we CANNOT run clerkMiddleware.
  // We must REWRITE protected routes to /auth-disabled so they don't crash.
  if (!hasClerkKeys()) {
    if (isProtectedPath(pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = "/auth-disabled";
      return stamp(NextResponse.rewrite(url), "rewrite_auth_disabled");
    }
    // Allow public pages (landing, etc) to render without Clerk
    return stamp(NextResponse.next(), "public_no_auth");
  }

  // 4) Auth Enabled: Run Clerk Middleware normally
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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};