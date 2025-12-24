// src/app/api/email/triage/stream/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Canonical SSE stream for triage UI.
 *
 * Contract:
 * - Client opens EventSource("/api/email/triage/stream")
 * - Server emits:
 *    event: hello (on connect)
 *    event: tick  (heartbeat every 15s)
 * - Client uses any event to trigger refresh from GET /api/email/triage
 *
 * Note:
 * This is intentionally "light" and does NOT assume any DB schema.
 * It's a bulletproof realtime signal you can later upgrade to true DB-driven events.
 */
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: any) => {
        const payload = typeof data === "string" ? data : JSON.stringify(data);
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      };

      // initial hello
      send("hello", { ok: true, ts: new Date().toISOString() });

      // heartbeat tick (client refreshes on tick)
      const interval = setInterval(() => {
        send("tick", { ts: new Date().toISOString() });
      }, 15000);

      // cleanup when client disconnects
      // @ts-ignore - controller has no standard close hook; cancel handles it
      (controller as any)._interval = interval;
    },
    cancel(reason) {
      // @ts-ignore
      const interval = (this as any)?._interval;
      if (interval) clearInterval(interval);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

