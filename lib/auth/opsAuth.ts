
import { auth } from "@clerk/nextjs/server";
import { sentrySetUser } from "../observability/sentryUser";

import { requireCanonUser } from "@/lib/canon/requireCanonUser";

/**
 * Canonical ops auth gate.
 * - Always require an authenticated Clerk session.
 * - Default scope: current user only
 * - Admins can act on a target user via target_user_id
 */
export async function requireOpsAuth(opts?: { targetUserId?: string | null }) {
    const a = await auth();
    const clerkUserId = a.userId;

    if (!clerkUserId) {
        return { ok: false as const, status: 401 as const, error: "unauthorized" };
    }

    const claims: any = a.sessionClaims ?? {};
    const role =
        claims?.publicMetadata?.role ??
        claims?.metadata?.role ??
        claims?.role ??
        null;

    const isAdmin = role === "admin";
    const targetUserId = opts?.targetUserId ?? null;

    // Determine the effective user ID for the operation
    const effectiveUserId = targetUserId || clerkUserId;

    // Auto-tag Sentry
    sentrySetUser(effectiveUserId);

    // If target is provided and different from self -> must be admin
    if (targetUserId && targetUserId !== clerkUserId && !isAdmin) {
        return { ok: false as const, status: 403 as const, error: "forbidden" };
    }

    // Resolve Canonical Identity (throws if missing/archived)
    const canon = await requireCanonUser(clerkUserId);

    return {
        ok: true as const,
        clerkUserId,
        userId: effectiveUserId,
        isAdmin,
        canon,
        // Backward compatibility for existing routes expecting .gate
        gate: {
            canon,
            userId: effectiveUserId,
            clerkUserId,
            isAdmin,
        },
    };
}
