import "server-only";
import type { AccessContext } from "./types";
import { auth } from "@clerk/nextjs/server";
import { getUserPlan } from "./plan";
import { getUserRoles } from "./roles";
import { getUserFlags } from "./flags";

export async function getAccessContext(): Promise<AccessContext> {
  const { userId } = await auth();
  if (!userId) return { isAuthed: false, userId: null };

  const [plan, roles, flags] = await Promise.all([
    getUserPlan(userId),
    getUserRoles(userId),
    getUserFlags(userId),
  ]);

  return {
    isAuthed: true,
    userId,
    plan,
    roles,
    flags,
  };
}

