import { revalidateTag } from "next/cache";
import {
    crmContactTag,
    crmFollowupsTag,
    crmInteractionsTag,
} from "./cacheTags";

/**
 * Centralized CRM cache invalidation.
 * Safe across Next.js / Vercel cache API differences.
 */
export function revalidateCRM(contactId: string) {
    // Call shape compatible with both 1-arg and 2-arg signatures
    revalidateTag(crmContactTag(contactId) as any);
    revalidateTag(crmFollowupsTag(contactId) as any);
    revalidateTag(crmInteractionsTag(contactId) as any);
}
