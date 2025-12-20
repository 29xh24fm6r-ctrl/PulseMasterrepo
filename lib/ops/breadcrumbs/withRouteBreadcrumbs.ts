// src/lib/ops/breadcrumbs/withRouteBreadcrumbs.ts
import "server-only";
import { withBreadcrumbs, addBreadcrumb, getBreadcrumbs } from "@/lib/ops/breadcrumbs/store";
import { logServerError } from "@/lib/ops/incidents/logServerError";

function rid() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function withRouteBreadcrumbs<T extends (req: Request, ...args: any[]) => Promise<Response>>(
  routeName: string,
  handler: T
): T {
  return (async (req: Request, ...args: any[]) => {
    const requestId = rid();
    const url = new URL(req.url);

    return await withBreadcrumbs(
      { requestId, route: routeName, href: url.toString(), max: 30 },
      async () => {
        addBreadcrumb({
          type: "info",
          name: "route_start",
          data: { route: routeName, method: (req as any).method || "GET", path: url.pathname, requestId },
        });

        try {
          const res = await handler(req, ...args);

          addBreadcrumb({
            type: "info",
            name: "route_end",
            data: { route: routeName, status: (res as any).status ?? null, requestId },
          });

          return res;
        } catch (e: any) {
          const crumbs = getBreadcrumbs();

          await logServerError({
            where: routeName,
            message: e?.message ?? "unknown_error",
            stack: e?.stack ?? null,
            route: url.pathname,
            href: url.toString(),
            meta: {
              requestId,
              breadcrumbs: crumbs,
            },
          });

          throw e;
        }
      }
    );
  }) as any;
}

