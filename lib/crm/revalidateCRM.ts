import { revalidateTag } from "next/cache";
import {
    crmContactTag,
    crmFollowupsTag,
    crmInteractionsTag,
} from "@/lib/crm/cacheTags";

/**
 * Next.js typings for revalidateTag have varied across versions/build tooling.
 * Some environments type it as (tag: string) => void, others as (tag: string, ...rest) => void.
 *
 * We normalize by calling through an `any` wrapper and supplying a harmless 2nd arg when required.
 */
function safeRevalidateTag(tag: string) {
    const fn = revalidateTag as unknown as (...args: any[]) => void;

    // If runtime function expects 2+ args, supply a second arg to satisfy that signature.
    // The value is intentionally non-semantic; it’s only to satisfy compat typing.
    if (fn.length >= 2) {
        fn(tag, "tag");
        return;
    }

    fn(tag);
}

export function revalidateCRM(contactId: string) {
    safeRevalidateTag(crmContactTag(contactId));
    safeRevalidateTag(crmFollowupsTag(contactId));
    safeRevalidateTag(crmInteractionsTag(contactId));
}
