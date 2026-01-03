"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { crmMarkFollowupDone } from "@/lib/client/crmClient";
import { useToast } from "@/components/ui/ToastProvider";
import { useAutoAnimateList } from "@/lib/ui/useAutoAnimateList";

type Followup = {
    id: string;
    title?: string | null;
    due_at?: string | null;
    status?: string | null;
};

export function FollowupsList(props: {
    contactId: string;
    followups: Followup[];
    onPulse?: (evt: { kind: "followup_done"; at: string }) => void; // 🔥 Relationship Pulse hook
}) {
    const { contactId } = props;

    const router = useRouter();
    const t = useToast();
    const listRef = useAutoAnimateList<HTMLDivElement>();

    const [items, setItems] = React.useState<Followup[]>(props.followups ?? []);
    const [busyId, setBusyId] = React.useState<string | null>(null);

    React.useEffect(() => {
        setItems(props.followups ?? []);
    }, [props.followups]);

    async function animateOut(rowId: string) {
        const el = document.getElementById(`followup_row_${rowId}`);
        if (!el) return;

        await el.animate(
            [
                { opacity: 1, transform: "scale(1)", height: `${el.clientHeight}px` },
                { opacity: 0, transform: "scale(0.98)", height: "0px" },
            ],
            { duration: 170, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
        ).finished.catch(() => { });
    }

    async function markDone(followupId: string) {
        if (busyId) return;

        setBusyId(followupId);

        // capture for rollback
        const prev = items;

        // ✅ animate then remove (feels amazing)
        await animateOut(followupId);
        setItems((cur) => cur.filter((f) => f.id !== followupId));

        props.onPulse?.({ kind: "followup_done", at: new Date().toISOString() });

        try {
            await crmMarkFollowupDone({
                followup_id: followupId,
                contact_id: contactId,
                done_at: new Date().toISOString(),
                outcome: "done",
            });

            t.success("Follow-up completed");
            router.refresh();
        } catch (err: any) {
            setItems(prev);
            t.error(err?.message ?? "Failed to mark done");
            router.refresh();
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <div ref={listRef} className="flex flex-col gap-2">
                {items?.length ? (
                    items.map((f) => (
                        <div
                            key={f.id}
                            id={`followup_row_${f.id}`}
                            className="border border-gray-800 rounded-2xl p-3 flex items-center justify-between gap-3 bg-gray-900/50"
                        >
                            <div className="min-w-0">
                                <div className="font-medium truncate text-gray-200">{f.title ?? "Follow-up"}</div>
                                {f.due_at ? (
                                    <div className="text-xs opacity-70 text-gray-400">
                                        Due: {new Date(f.due_at).toLocaleString()}
                                    </div>
                                ) : null}
                            </div>

                            <button
                                className="border border-cyan-800 rounded-xl px-3 py-1 text-xs text-cyan-400 hover:bg-cyan-900/50 transition"
                                onClick={() => markDone(f.id)}
                                disabled={busyId === f.id}
                                aria-busy={busyId === f.id}
                            >
                                {busyId === f.id ? "..." : "Mark done"}
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="text-sm opacity-50 text-gray-500 italic">No open follow-ups.</div>
                )}
            </div>
        </div>
    );
}
