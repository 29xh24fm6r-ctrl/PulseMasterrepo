import { rateLimitOrThrow } from "@/lib/api/guards";

/**
 * Central place to tune ops limits.
 * Keep these conservative: ops routes can be expensive.
 */
export async function opsLimit(actorUserId: string, bucket: string) {
    // bucket is part of the key; rateLimitOrThrow handles windowing.
    // Tune as needed; these are intentionally tight.
    await rateLimitOrThrow(actorUserId, `ops:${bucket}`);
}
