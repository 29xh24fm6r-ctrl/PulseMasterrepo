// src/lib/ops/incidents/logServerError.ts
import "server-only";
import { writeOpsEvent } from "@/lib/ops/incidents/writeEvent";

export async function logServerError(args: {
  where: string; // e.g. "DealsPage", "getCurrentBankId"
  message: string;
  stack?: string | null;
  route?: string | null;
  href?: string | null;
  meta?: Record<string, unknown>;
  userId?: string | null;
}) {
  await writeOpsEvent({
    source: "app",
    event_type: "server_error",
    level: "error",
    summary: `server error @ ${args.where}: ${args.message}`.slice(0, 180),
    link: args.href ?? null,
    payload: {
      where: args.where,
      message: args.message,
      stack: args.stack ?? null,
      route: args.route ?? null,
      userId: args.userId ?? null,
      meta: args.meta ?? {},
      capturedAt: new Date().toISOString(),
    },
  });
}

