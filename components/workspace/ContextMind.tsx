"use client";

/**
 * Context Mind - Entity summary + timeline + brain + coach
 * components/workspace/ContextMind.tsx
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ContextMindPayload } from "@/lib/surfaces/types";

export function ContextMind(props: { 
  data?: ContextMindPayload;
  entityId?: string | null;
  entityType?: string;
}) {
  const [context, setContext] = useState<ContextMindPayload | null>(props.data || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (props.entityId && props.entityType) {
      loadContext();
    } else if (props.data) {
      setContext(props.data);
    } else {
      setContext(null);
    }
  }, [props.entityId, props.entityType]);

  async function loadContext() {
    if (!props.entityId || !props.entityType) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/organism/context?type=${props.entityType}&id=${props.entityId}`
      );
      if (response.ok) {
        const data = await response.json();
        setContext(data);
      }
    } catch (error) {
      console.error("Context load error:", error);
    } finally {
      setLoading(false);
    }
  }

  const d = context;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-4">
      <div className="text-sm font-semibold text-white">Context Mind</div>
      <div className="text-xs text-zinc-500">Pulse brings memory + intelligence to the current thing.</div>

      {loading ? (
        <div className="mt-4 text-sm text-zinc-400">Loading context...</div>
      ) : (
        <div className="mt-4 space-y-4">
          {d?.entity?.title ? (
            <div>
              <div className="text-xs text-zinc-500">Selected</div>
              <div className="text-sm text-white">{d.entity.title}</div>
            </div>
          ) : null}

          {d?.summary ? (
            <div>
              <div className="text-xs text-zinc-500">Pulse Summary</div>
              <div className="text-sm text-zinc-200">{d.summary}</div>
            </div>
          ) : (
            <div className="text-sm text-zinc-400">Select something in the stream to see context.</div>
          )}

          {d?.coach ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
              <div className="text-xs text-zinc-500">Coach Lens</div>
              <div className="text-sm text-white">{d.coach.name}</div>
              <div className="mt-1 text-sm text-zinc-300">{d.coach.note}</div>
              <div className="mt-1 text-xs text-zinc-500">Confidence: {(d.coach.confidence * 100).toFixed(0)}%</div>
            </div>
          ) : null}

          {d?.timeline && d.timeline.length > 0 && (
            <div>
              <div className="text-xs text-zinc-500 mb-2">Timeline</div>
              <div className="space-y-1">
                {d.timeline.slice(0, 3).map((event) => (
                  <div key={event.id} className="text-xs text-zinc-400 border-l-2 border-zinc-800 pl-2 py-1">
                    <div className="text-zinc-200">{event.text}</div>
                    <div className="text-zinc-500">{new Date(event.when).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {d?.brainHighlights && d.brainHighlights.length > 0 && (
            <div>
              <div className="text-xs text-zinc-500 mb-2">Brain Highlights</div>
              <div className="space-y-1">
                {d.brainHighlights.slice(0, 2).map((h) => (
                  <div key={h.id} className="text-xs text-zinc-300 bg-zinc-950/40 rounded p-2">
                    {h.text}...
                  </div>
                ))}
              </div>
            </div>
          )}

          {d?.nextBestAction?.href ? (
            <Link
              href={d.nextBestAction.href}
              className="inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              {d.nextBestAction.label}
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
