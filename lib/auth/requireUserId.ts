import "server-only";
import { auth } from "@clerk/nextjs/server";

/**
 * Canonical Pulse auth accessor.
 * - Production: requires Clerk session
 * - Dev: allows override via PULSE_DEV_USER_ID so local smoke tests can run
 */
export async function requireUserId() {
  const { userId } = await auth();

  if (userId) return userId;

  // DEV OVERRIDE: allow local testing without Clerk session cookies
  if (process.env.NODE_ENV === "development") {
    const dev = process.env.PULSE_DEV_USER_ID?.trim();
    if (dev) return dev;
  }

  throw new Error("Unauthorized");
}

