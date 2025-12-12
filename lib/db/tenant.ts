/**
 * Tenant safety utilities for multi-tenant data isolation
 */

/**
 * Ensure payload includes owner_user_id for tenant isolation
 * @param userId - Clerk user ID
 * @param payload - Data to insert/update
 * @returns Payload with owner_user_id set
 */
export function withOwner<T extends Record<string, any>>(
  userId: string,
  payload: T
): T & { owner_user_id: string } {
  return { ...payload, owner_user_id: userId };
}

/**
 * Validate that a resource belongs to a user
 * @param resource - Resource with owner_user_id
 * @param userId - User ID to check against
 * @throws Error if resource doesn't belong to user
 */
export function assertOwnership(
  resource: { owner_user_id?: string | null } | null | undefined,
  userId: string
): asserts resource is { owner_user_id: string } {
  if (!resource) {
    throw new Error("Resource not found");
  }
  if (resource.owner_user_id !== userId) {
    throw new Error("UNAUTHORIZED: Resource does not belong to user");
  }
}

