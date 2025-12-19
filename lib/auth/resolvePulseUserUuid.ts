// lib/auth/resolvePulseUserUuid.ts
// Sprint 3A: Canonical UUID user_id with FK to public.users(id)
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Canonical mapping: Clerk user ID → public.users.id (UUID)
 * 
 * This function ensures a user row exists in public.users and returns the UUID.
 * It uses upsert pattern to handle first-time users gracefully.
 * 
 * @param clerkUserId - Clerk user ID (e.g., "user_abc123")
 * @returns Pulse internal UUID from public.users.id
 * @throws Error if user cannot be created/resolved
 */
export async function resolvePulseUserUuidFromClerk(clerkUserId: string): Promise<string> {
  // First, try to find existing user
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (existing?.id) {
    return existing.id;
  }

  // If not found, upsert (insert or update)
  // This handles first-time users and ensures the row exists
  const { data: upserted, error: upsertError } = await supabaseAdmin
    .from("users")
    .upsert(
      {
        clerk_user_id: clerkUserId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "clerk_user_id",
        ignoreDuplicates: false,
      }
    )
    .select("id")
    .single();

  if (upsertError || !upserted?.id) {
    // If upsert failed, try one more lookup (race condition handling)
    const { data: retry, error: retryError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (retry?.id) {
      return retry.id;
    }

    throw new Error(
      `Failed to resolve or create user for clerk_user_id=${clerkUserId}. ` +
      `Upsert error: ${upsertError?.message ?? "unknown"}. ` +
      `Retry error: ${retryError?.message ?? "unknown"}`
    );
  }

  return upserted.id;
}

