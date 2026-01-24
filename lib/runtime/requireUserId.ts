import { auth } from "@clerk/nextjs/server";

/**
 * Canonical runtime identity resolver.
 *
 * PHASE A3: Stop relying solely on middleware-injected headers.
 *
 * Strategy:
 * 1. PRIMARY: Call Clerk's auth() directly (canonical, host-aware)
 * 2. FALLBACK: Check x-owner-user-id header (CI/preview/test harness)
 *
 * This removes middleware injection as a single point of failure.
 * If middleware redirect fails (apex vs www split), we still get userId.
 */
export async function requireUserId(req: Request): Promise<string | null> {
  // Primary: Clerk server auth (real, canonical source of truth)
  try {
    const { userId } = await auth();
    if (userId) {
      console.log('[requireUserId] Resolved from Clerk auth():', userId.substring(0, 8) + '...');
      return userId;
    }
  } catch (err) {
    console.warn('[requireUserId] Clerk auth() failed:', err);
  }

  // Fallback: middleware injection / CI harness / preview mode
  const headers = new Headers(req.headers);
  const injected = headers.get("x-owner-user-id");
  if (injected) {
    console.log('[requireUserId] Resolved from header injection:', injected.substring(0, 8) + '...');
    return injected;
  }

  console.warn('[requireUserId] No userId found via auth() or header');
  return null;
}
