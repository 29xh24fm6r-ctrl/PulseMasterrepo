import "server-only";
import { auth } from "@clerk/nextjs/server";
import { trackEvent } from "./server";
import { featureIdForPath } from "@/lib/access/route-map";

export async function withApiAnalytics<T>(
  req: Request,
  handler: () => Promise<Response>
): Promise<Response> {
  const start = Date.now();

  let userId: string | null = null;
  try {
    const a = await auth();
    userId = a.userId ?? null;
  } catch {}

  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  const feature_id = featureIdForPath(path.replace(/^\/api/, "")) || null;
  const request_id = req.headers.get("x-request-id");

  let status = 200;

  try {
    const res = await handler();
    status = res.status;

    trackEvent({
      user_id: userId,
      request_id,
      event_name: "api_call",
      feature_id,
      path,
      method,
      status,
      latency_ms: Date.now() - start,
      user_agent: req.headers.get("user-agent"),
      referrer: req.headers.get("referer"),
    });

    return res;
  } catch (err: any) {
    trackEvent({
      user_id: userId,
      request_id,
      event_name: "api_error",
      feature_id,
      path,
      method,
      status: 500,
      latency_ms: Date.now() - start,
      properties: { message: err?.message || "error" },
      user_agent: req.headers.get("user-agent"),
      referrer: req.headers.get("referer"),
    });
    throw err;
  }
}

