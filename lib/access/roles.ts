import "server-only";
import type { UserRole } from "./types";
import { auth } from "@clerk/nextjs/server";

// Prefer Clerk JWT claims if you have them. Fallback to ["user"].
// Also check PULSE_ADMIN_CLERK_IDS for admin role
export async function getUserRoles(userId?: string): Promise<UserRole[]> {
  const roles: UserRole[] = ["user"];

  try {
    const { sessionClaims } = await auth();
    const claimRoles = (sessionClaims as any)?.roles;
    if (Array.isArray(claimRoles) && claimRoles.length) {
      roles.push(...(claimRoles as UserRole[]));
    }
  } catch {}

  // Check admin list
  if (userId) {
    const adminIds = process.env.PULSE_ADMIN_CLERK_IDS?.split(",").map((s) => s.trim()) || [];
    if (adminIds.includes(userId)) {
      roles.push("admin", "ops");
    }
  }

  return Array.from(new Set(roles));
}

