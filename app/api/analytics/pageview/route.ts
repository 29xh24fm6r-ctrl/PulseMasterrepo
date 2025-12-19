import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { trackEvent } from "@/lib/analytics/server";
import { featureIdForPath } from "@/lib/access/route-map";
import { log } from "@/lib/obs/logger";
import { getRequestMeta } from "@/lib/obs/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const body = await req.json().catch(() => ({}));
    const path = body?.path || "";

    const feature_id = featureIdForPath(path) || null;

    await trackEvent({
      user_id: userId ?? null,
      request_id: req.headers.get("x-request-id"),
      event_name: "page_view",
      feature_id,
      path,
      method: "GET",
      user_agent: req.headers.get("user-agent"),
      referrer: req.headers.get("referer"),
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[ANALYTICS_PAGEVIEW_ERROR]", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "pageview failed" },
      { status: 500 }
    );
  }
}

