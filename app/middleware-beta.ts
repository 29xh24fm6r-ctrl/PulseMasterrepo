import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Beta mode middleware - restricts access to non-beta features
 * Add this to your main middleware.ts if PULSE_BETA_MODE is enabled
 */

const BETA_MODE = process.env.PULSE_BETA_MODE === "true";

// Routes that should be disabled in beta mode
const BETA_BLOCKED_ROUTES = [
  "/notion",
  "/api/notion",
  // Add other non-beta routes here
];

// Routes that are beta-safe
const BETA_ALLOWED_ROUTES = [
  "/",
  "/home",
  "/life",
  "/work",
  "/tasks",
  "/deals",
  "/contacts",
  "/dashboard",
  "/api/crm",
  "/api/profile",
  "/api/emotion",
  "/api/pulse",
  "/sign-in",
  "/sign-up",
];

export function betaMiddleware(request: NextRequest) {
  if (!BETA_MODE) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;

  // Check if route is blocked
  const isBlocked = BETA_BLOCKED_ROUTES.some(blocked => pathname.startsWith(blocked));
  if (isBlocked) {
    return NextResponse.json(
      { error: "This feature is disabled in beta mode" },
      { status: 403 }
    );
  }

  // In beta mode, we're more permissive but log access
  // Uncomment to restrict to only allowed routes:
  /*
  const isAllowed = BETA_ALLOWED_ROUTES.some(allowed => pathname.startsWith(allowed));
  if (!isAllowed) {
    return NextResponse.json(
      { error: "This feature is not available in beta mode" },
      { status: 403 }
    );
  }
  */

  return NextResponse.next();
}

