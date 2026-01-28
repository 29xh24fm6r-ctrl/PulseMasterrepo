// rate-limit.ts
// Simple in-memory per-user rate limiter.
// Degrades gracefully — returns structured status, never throws.
// No persistence needed: resets on deploy (acceptable for Cloud Run).

const MAX_CALLS_PER_MINUTE = 60;
const WINDOW_MS = 60_000;

// userId → timestamps of recent calls
const callLog = new Map<string, number[]>();

// Periodic cleanup to prevent memory leak (every 5 minutes)
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [userId, timestamps] of callLog) {
    const recent = timestamps.filter((t) => t > cutoff);
    if (recent.length === 0) {
      callLog.delete(userId);
    } else {
      callLog.set(userId, recent);
    }
  }
}, 5 * 60_000);

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  limit: number;
}

/**
 * Check and record a tool call for rate limiting.
 * Returns { ok: false } if limit exceeded — caller should return structured status.
 */
export function checkRateLimit(userId: string): RateLimitResult {
  if (!userId) return { ok: true, remaining: MAX_CALLS_PER_MINUTE, limit: MAX_CALLS_PER_MINUTE };

  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  if (!callLog.has(userId)) callLog.set(userId, []);
  const timestamps = callLog.get(userId)!;

  // Prune old entries
  const recent = timestamps.filter((t) => t > cutoff);

  if (recent.length >= MAX_CALLS_PER_MINUTE) {
    callLog.set(userId, recent);
    return { ok: false, remaining: 0, limit: MAX_CALLS_PER_MINUTE };
  }

  recent.push(now);
  callLog.set(userId, recent);

  return {
    ok: true,
    remaining: MAX_CALLS_PER_MINUTE - recent.length,
    limit: MAX_CALLS_PER_MINUTE,
  };
}
