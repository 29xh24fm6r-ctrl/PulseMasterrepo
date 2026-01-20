"use client";

import { useOverlays } from "@/components/shell/overlays/OverlayContext";
import { HelpCircle, Info, Shuffle } from "lucide-react";

export interface NotableEvent {
    id: string;
    timestamp: string; // ISO
    type: 'shift' | 'coordination';
    title: string;
    detail?: string;
    explainable?: boolean;
}

interface NotableEventsProps {
    events: NotableEvent[];
}

export function NotableEvents({ events }: NotableEventsProps) {
    const { setExplanationActive } = useOverlays();

    if (events.length === 0) {
        return (
            <div className="mb-12">
                <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4 px-1">
                    Notable
                </h2>
                <div className="p-6 text-center text-zinc-400 text-sm bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl dashed border border-zinc-200 dark:border-zinc-800">
                    No notable shifts recently.
                </div>
            </div>
        );
    }

    import { TOKENS } from "@/lib/ui/tokens";

    return (
        <div className="mb-12">
            <h2 className={`text-xs font-semibold ${TOKENS.COLORS.text.dim} uppercase tracking-wider mb-4 px-2`}>
                Notable
            </h2>
            <div className="space-y-3">
                {events.map((event) => (
                    <div key={event.id} className={`group relative flex gap-4 p-4 ${TOKENS.COLORS.glass.bg} ${TOKENS.COLORS.glass.border} border ${TOKENS.RADIUS.sm} transition-all hover:bg-white/10`}>
                        <div className="mt-0.5 shrink-0 text-zinc-400">
                            {event.type === 'coordination' ? <Shuffle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-baseline justify-between">
                                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{event.title}</h3>
                                <span className="text-xs text-zinc-500">
                                    {new Date(event.timestamp).toLocaleDateString(undefined, { weekday: 'short' })}
                                </span>
                            </div>
                            {event.detail && (
                                <p className="text-sm text-zinc-500 mt-1">{event.detail}</p>
                            )}
                        </div>

                        {event.explainable && (
                            <button
                                onClick={() => setExplanationActive(true)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-zinc-400 hover:text-violet-600 bg-white dark:bg-zinc-900 shadow-sm rounded-full"
                                title="Why did this happen?"
                            >
                                <HelpCircle className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
