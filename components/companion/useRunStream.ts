// components/companion/useRunStream.ts
"use client";

import { useEffect, useRef, useState } from "react";

type StreamEvent = { event: string; data: any };

export function useRunStream(args: { runId: string | null; ownerUserId: string | null }) {
    const [events, setEvents] = useState<StreamEvent[]>([]);
    const [status, setStatus] = useState<"idle" | "streaming" | "ended">("idle");
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!args.runId || !args.ownerUserId) return;

        setEvents([]);
        setStatus("streaming");

        const ac = new AbortController();
        abortRef.current = ac;

        const url = `/api/runs/${args.runId}/stream`;

        (async () => {
            try {
                const res = await fetch(url, {
                    method: "GET",
                    headers: {
                        "Accept": "text/event-stream",
                        "x-owner-user-id": args.ownerUserId,
                    },
                    signal: ac.signal,
                });

                if (!res.ok || !res.body) throw new Error("stream_failed");

                const reader = res.body.getReader();
                const decoder = new TextDecoder("utf-8");
                let buffer = "";

                const push = (event: string, data: any) => {
                    setEvents((prev) => [...prev, { event, data }]);
                };

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });

                    // Parse SSE frames split by \n\n
                    while (true) {
                        const idx = buffer.indexOf("\n\n");
                        if (idx === -1) break;

                        const frame = buffer.slice(0, idx);
                        buffer = buffer.slice(idx + 2);

                        const { event, data } = parseSseFrame(frame);
                        if (!event) continue;

                        if (event === "END") {
                            push("END", data);
                            setStatus("ended");
                            ac.abort();
                            return;
                        }

                        push(event, data);
                    }
                }

                setStatus("ended");
            } catch {
                // Only set error if not aborted
                if (!ac.signal.aborted) {
                    setEvents((prev) => [...prev, { event: "ERROR", data: { message: "stream_error" } }]);
                    setStatus("ended");
                }
            }
        })();

        return () => {
            ac.abort();
            abortRef.current = null;
        };
    }, [args.runId, args.ownerUserId]);

    return { events, status };
}

function parseSseFrame(frame: string): { event: string | null; data: any } {
    let event: string | null = null;
    let data: any = null;

    const lines = frame.split("\n");
    for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice("event:".length).trim();
        if (line.startsWith("data:")) {
            const raw = line.slice("data:".length).trim();
            data = safeJson(raw);
        }
    }

    return { event, data };
}

function safeJson(raw: string) {
    try {
        return JSON.parse(raw);
    } catch {
        return raw;
    }
}
