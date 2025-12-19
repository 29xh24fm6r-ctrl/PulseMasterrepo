// lib/server/jobs/backoff.ts
// Exponential backoff calculation
import "server-only";

/**
 * Calculate next delay in seconds based on attempt number
 * 
 * attempt 0: 0s
 * attempt 1: 60s (1 minute)
 * attempt 2: 240s (4 minutes)
 * attempt 3: 960s (16 minutes)
 * cap at 3600s (1 hour)
 */
export function nextDelaySeconds(attempt: number): number {
  if (attempt === 0) return 0;
  
  // Exponential backoff: 60 * 4^(attempt-1)
  const delay = 60 * Math.pow(4, attempt - 1);
  
  // Cap at 1 hour
  return Math.min(delay, 3600);
}

/**
 * Calculate next scheduled_at timestamp
 */
export function nextScheduledAt(attempt: number): string {
  const delaySeconds = nextDelaySeconds(attempt);
  const nextTime = new Date(Date.now() + delaySeconds * 1000);
  return nextTime.toISOString();
}

