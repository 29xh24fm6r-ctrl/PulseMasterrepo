// app/api/runs/[runId]/stream/route.ts
import { NextRequest } from "next/server";
import { requireOwnerUserId } from "@/lib/auth/requireOwnerUserId";
import { fetchEventsAfter, fetchRunStatus } from "@/lib/runs/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

export async function GET(req: NextRequest, ctx: { params: { runId: string } }) {
    const owner = requireOwnerUserId(req);
    const runId = ctx.params.runId;

    const url = new URL(req.url);
    const since = Number(url.searchParams.get("since") ?? "0");
    let lastSeq = Number.isFinite(since) ? since : 0;

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            // Keepalive + headers handled by Response below
            try {
                controller.enqueue(encoder.encode(`event: HELLO\ndata: {"run_id":"${runId}"}\n\n`));

                for (let i = 0; i < 600; i++) {
                    // poll up to ~60s (600 * 100ms)
                    const events = await fetchEventsAfter({ run_id: runId, after_seq: lastSeq });

                    for (const ev of events) {
                        lastSeq = Math.max(lastSeq, Number(ev.seq));
                        controller.enqueue(
                            encoder.encode(
                                `event: ${ev.event_type}\ndata: ${JSON.stringify({
                                    seq: ev.seq,
                                    payload: ev.payload,
                                    created_at: ev.created_at,
                                })}\n\n`
                            )
                        );
                    }

                    const run = await fetchRunStatus({ run_id: runId });
                    const isTerminal = run.status === "succeeded" || run.status === "failed" || run.status === "canceled";

                    if (isTerminal && events.length === 0) {
                        controller.enqueue(
                            encoder.encode(`event: END\ndata: ${JSON.stringify({ status: run.status, lastSeq })}\n\n`)
                        );
                        controller.close();
                        return;
                    }

                    await sleep(100);
                }

                controller.enqueue(encoder.encode(`event: END\ndata: ${JSON.stringify({ status: "timeout", lastSeq })}\n\n`));
                controller.close();
            } catch {
                // fail safe: do not leak details
                controller.enqueue(encoder.encode(`event: END\ndata: ${JSON.stringify({ status: "error", lastSeq })}\n\n`));
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}
