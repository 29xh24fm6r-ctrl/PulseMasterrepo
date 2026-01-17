// components/companion/useRunStream.ts
"use client";

import { useEffect, useRef, useState } from "react";

type StreamEvent = {
    event: string;
    data: any;
};

export function useRunStream(args: { runId: string | null; ownerUserId: string | null }) {
    const [events, setEvents] = useState<StreamEvent[]>([]);
    const [status, setStatus] = useState<"idle" | "streaming" | "ended">("idle");
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!args.runId || !args.ownerUserId) return;

        setEvents([]);
        setStatus("streaming");

        if (abortControllerRef.current) abortControllerRef.current.abort();
        const ac = new AbortController();
        abortControllerRef.current = ac;

        const fetchStream = async () => {
            try {
                const res = await fetch(`/api/runs/${args.runId}/stream`, {
                    headers: {
                        'x-owner-user-id': args.ownerUserId!
                    },
                    signal: ac.signal
                });

                if (!res.body) throw new Error("No body");
                const reader = res.body.getReader();
                const decoder = new TextDecoder();

                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n\n');
                    buffer = lines.pop() || ''; // Keep incomplete part

                    for (const group of lines) {
                        const eventLines = group.split('\n');
                        let event = '';
                        let data = '';

                        for (const line of eventLines) {
                            if (line.startsWith('event: ')) event = line.substring(7);
                            if (line.startsWith('data: ')) data = line.substring(6);
                        }

                        if (event && data) {
                            const parsed = safeJson(data);
                            setEvents(prev => [...prev, { event, data: parsed }]);
                            if (event === 'END') {
                                setStatus("ended");
                                return; // Stop reading
                            }
                        }
                    }
                }

            } catch (err: any) {
                if (err.name === 'AbortError') return;
                console.error("Stream error", err);
                setStatus("ended");
            }
        };

        fetchStream();

        return () => {
            ac.abort();
        };
    }, [args.runId, args.ownerUserId]);

    return { events, status };
}

function safeJson(s: any) {
    try {
        return JSON.parse(String(s));
    } catch {
        return s;
    }
}
