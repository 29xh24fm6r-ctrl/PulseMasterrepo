import "server-only";
import { auth } from "@clerk/nextjs/server";

export class UnauthorizedError extends Error {
  status = 401 as const;
  constructor(message = "UNAUTHORIZED: Admin access required") {
    super(message);
  }
}

export class ForbiddenError extends Error {
  status = 403 as const;
  constructor(message = "FORBIDDEN: Admin access required") {
    super(message);
  }
}

export async function requireAdmin() {
  const { userId } = await auth();

  if (!userId) {
    throw new UnauthorizedError();
  }

  const allowlist = process.env.PULSE_ADMIN_CLERK_IDS;
  if (!allowlist) {
    throw new Error("Missing env PULSE_ADMIN_CLERK_IDS");
  }

  const allowedIds = allowlist.split(",").map(id => id.trim()).filter(Boolean);
  if (!allowedIds.includes(userId)) {
    throw new ForbiddenError();
  }

  return { userId };
}

