// components/companion/PatternsPanel.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type Item = {
    id: string;
    source: string;
    artifact_type: string;
    content: string;
    confidence: number | null;
    created_at: string;
};

export function PatternsPanel(props: { ownerUserId: string; context: any }) {
    const [items, setItems] = useState<Item[]>([]);
    const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

    useEffect(() => {
        let mounted = true;

        (async () => {
            setState("loading");
            try {
                const res = await fetch("/api/memory/attention/recent", {
                    headers: { "x-owner-user-id": props.ownerUserId },
                });
                if (!res.ok) throw new Error("bad");
                const json = await res.json();
                if (!mounted) return;
                setItems(json.items ?? []);
                setState("done");
            } catch {
                if (!mounted) return;
                setState("error");
            }
        })();

        return () => {
            mounted = false;
        };
    }, [props.ownerUserId]);

    const counts = useMemo(() => {
        const m = new Map<string, number>();
        for (const it of items) m.set(it.artifact_type, (m.get(it.artifact_type) ?? 0) + 1);
        return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
    }, [items]);

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between">
                <div className="text-xs font-medium">Patterns</div>
                <div className="text-[11px] opacity-70">{state}</div>
            </div>

            {counts.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                    {counts.slice(0, 4).map(([k, v]) => (
                        <span key={k} className="text-[11px] rounded-full border border-white/10 bg-white/5 px-2 py-1 opacity-90">
                            {k}: {v}
                        </span>
                    ))}
                </div>
            ) : (
                <div className="mt-2 text-xs opacity-70">No signals captured yet.</div>
            )}

            {items.length ? (
                <div className="mt-2 max-h-32 overflow-auto text-[11px] opacity-80">
                    {items.slice(0, 6).map((it) => (
                        <div key={it.id} className="py-1 border-b border-white/5 last:border-b-0">
                            <div className="opacity-70">{it.artifact_type}</div>
                            <div className="mt-0.5">{it.content}</div>
                        </div>
                    ))}
                </div>
            ) : null}

            <div className="mt-2 text-[11px] opacity-70">
                Signals only. No auto-actions. This is the foundation for attention support.
            </div>
        </div>
    );
}
