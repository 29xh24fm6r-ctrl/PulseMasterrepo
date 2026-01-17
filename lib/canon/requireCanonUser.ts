// lib/canon/requireCanonUser.ts
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export type CanonUser = {
    clerkUserId: string;
    userIdUuid: string; // identity_users.id (uuid)
    identityKind: "human" | "system" | "orphan";
    isArchived: boolean;
};

export class CanonError extends Error {
    code:
        | "MISSING_CLERK_USER_ID"
        | "IDENTITY_NOT_FOUND"
        | "IDENTITY_ARCHIVED"
        | "IDENTITY_ORPHAN_WRITE_BLOCKED"
        | "SUPABASE_ERROR";

    constructor(code: CanonError["code"], message: string) {
        super(message);
        this.name = "CanonError";
        this.code = code;
    }
}

/**
 * Resolves a Clerk user id -> canonical identity_users row.
 * Enforces: must exist and must not be archived.
 * Optional: blocks "orphan" from writing by default.
 */
export async function requireCanonUser(
    clerkUserId: string,
    opts?: { allowOrphanWrites?: boolean }
): Promise<CanonUser> {
    if (!clerkUserId) {
        throw new CanonError("MISSING_CLERK_USER_ID", "Missing clerk user id.");
    }

    // Use admin client for canonical lookup
    const supabase = getSupabaseAdminRuntimeClient();

    const { data, error } = await supabase
        .from("identity_users")
        .select("id, clerk_user_id, identity_kind, is_archived")
        .eq("clerk_user_id", clerkUserId)
        .maybeSingle();

    if (error) {
        throw new CanonError("SUPABASE_ERROR", `Canon lookup failed: ${error.message}`);
    }

    if (!data) {
        throw new CanonError(
            "IDENTITY_NOT_FOUND",
            `Canon violation: no identity_users row for clerk_user_id=${clerkUserId}`
        );
    }

    const canon: CanonUser = {
        clerkUserId: data.clerk_user_id,
        userIdUuid: data.id,
        identityKind: (data.identity_kind ?? "human") as CanonUser["identityKind"],
        isArchived: Boolean(data.is_archived),
    };

    if (canon.isArchived) {
        throw new CanonError(
            "IDENTITY_ARCHIVED",
            `Canon violation: archived identity cannot write (clerk_user_id=${clerkUserId})`
        );
    }

    if (canon.identityKind === "orphan" && !opts?.allowOrphanWrites) {
        throw new CanonError(
            "IDENTITY_ORPHAN_WRITE_BLOCKED",
            `Canon violation: orphan identity blocked from writes (clerk_user_id=${clerkUserId})`
        );
    }

    return canon;
}
