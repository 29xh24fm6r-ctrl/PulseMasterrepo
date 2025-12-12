/**
 * Owner User ID Helper
 * Returns Clerk user id for owner_user_id enforcement
 * lib/auth/owner.ts
 */

import { auth } from "@clerk/nextjs/server";

/**
 * Get owner user ID (Clerk user id)
 * Throws if not authenticated
 */
export async function getOwnerUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("UNAUTHORIZED: User must be authenticated");
  }
  return userId;
}

/**
 * Get owner user ID or null (does not throw)
 */
export async function getOwnerUserIdOrNull(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

