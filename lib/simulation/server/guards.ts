// lib/simulation/server/guards.ts
import "server-only";

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_RUNS = 10;

// In-memory rate limiter (per user)
const rateLimitStore = new Map<string, number[]>();

/**
 * Check if simulation is enabled in current environment
 */
export function requireSimulationEnabled(): void {
  const allowProd = process.env.SIMULATION_ALLOW_PROD === "true";
  const nodeEnv = process.env.NODE_ENV || "development";

  if (nodeEnv === "production" && !allowProd) {
    const err = new Error("Simulation disabled in production");
    (err as any).status = 403;
    throw err;
  }
}

/**
 * Check rate limit for user
 * Returns true if allowed, throws if rate limited
 */
export function checkRateLimit(userId: string): void {
  const now = Date.now();
  const userRuns = rateLimitStore.get(userId) || [];
  
  // Remove runs outside the window
  const recentRuns = userRuns.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  
  if (recentRuns.length >= RATE_LIMIT_MAX_RUNS) {
    const err = new Error(`Rate limit exceeded: ${RATE_LIMIT_MAX_RUNS} runs per minute`);
    (err as any).status = 429;
    throw err;
  }
  
  // Add current run
  recentRuns.push(now);
  rateLimitStore.set(userId, recentRuns);
}

