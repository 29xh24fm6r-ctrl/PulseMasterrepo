import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { featureIdForPath } from "@/lib/access/route-map";
import { FEATURE_REGISTRY } from "@/lib/features/registry";
import { getAccessContext } from "@/lib/access/context";
import { evalGate } from "@/lib/access/gates";

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // Generate or propagate request ID (using Web Crypto API for Edge Runtime)
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const res = NextResponse.next();

  // Propagate request ID to downstream
  res.headers.set("x-request-id", requestId);

  // Route-level gate enforcement (skip API routes - they handle auth themselves)
  const pathname = req.nextUrl.pathname;
  if (!pathname.startsWith("/api/") && pathname !== "/sign-in" && pathname !== "/sign-up") {
    try {
      const featureId = featureIdForPath(pathname);
      if (featureId) {
        const feature = FEATURE_REGISTRY.find((f) => f.id === featureId);
        if (feature?.gate) {
          const ctx = await getAccessContext();
          const result = evalGate(feature.gate, ctx);
          if (!result.ok) {
            const reason = "reason" in result ? result.reason : "Not allowed";
            
            // Track gate block event
            try {
              const { trackEvent } = await import("@/lib/analytics/server");
              await trackEvent({
                user_id: ctx.userId || null,
                request_id: requestId,
                event_name: "gate_block",
                feature_id: feature.id,
                path: pathname,
                properties: { reason: feature.locked_copy || reason },
              });
            } catch {
              // Analytics must never break product flow
            }
            
            // Redirect based on reason
            if (reason === "Sign in required") {
              return NextResponse.redirect(new URL("/sign-in", req.url));
            }
            if (reason.includes("Upgrade to")) {
              return NextResponse.redirect(new URL("/settings/billing", req.url));
            }
            // Default: redirect to features with locked param
            return NextResponse.redirect(new URL(`/features?locked=${featureId}`, req.url));
          }
        }
      }
    } catch (e) {
      // If gate evaluation fails, allow through (fail open for safety)
      console.warn("Gate evaluation failed:", e);
    }
  }

  return res;
});

export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
