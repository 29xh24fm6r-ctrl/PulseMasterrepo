import { auth } from "@clerk/nextjs/server";

/**
 * Require authenticated Clerk user ID
 * Throws error if user is not authenticated
 * @returns Clerk userId (never null)
 * @throws Error if unauthenticated
 */
export async function requireClerkUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("UNAUTHORIZED: User must be authenticated");
  }
  return userId;
}

/**
 * Get Clerk user ID (returns null if not authenticated)
 * Use this for optional authentication scenarios
 */
export async function getClerkUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}
