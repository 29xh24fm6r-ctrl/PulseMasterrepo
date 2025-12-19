import { auth } from "@clerk/nextjs/server";

function parseAdminIds(raw: string | undefined): string[] {
  if (!raw) return [];

  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function requireAdminClerkUserId(): Promise<string> {
  const { userId } = await auth();

  if (!userId) {
    throw new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const adminIds = parseAdminIds(process.env.PULSE_ADMIN_CLERK_IDS);

  // If env isn't set, fail CLOSED (secure-by-default) with a useful message
  if (adminIds.length === 0) {
    throw new Response(
      JSON.stringify({
        ok: false,
        error: "Missing env PULSE_ADMIN_CLERK_IDS",
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      }
    );
  }

  if (!adminIds.includes(userId)) {
    throw new Response(
      JSON.stringify({ ok: false, error: "FORBIDDEN: Admin access required" }),
      {
        status: 403,
        headers: { "content-type": "application/json" },
      }
    );
  }

  return userId;
}

