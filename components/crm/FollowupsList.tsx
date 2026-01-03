"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { crmMarkFollowupDone } from "@/lib/client/crmClient";
import { useToast } from "@/components/ui/ToastProvider";

type Followup = {
    id: string;
    title?: string | null;
    due_at?: string | null;
    status?: string | null;
};

export function FollowupsList(props: {
    contactId: string;
    followups: Followup[];
}) {
    const { contactId } = props;

    const router = useRouter();
    const t = useToast();

    // local list so we can optimistic-update
    const [items, setItems] = React.useState<Followup[]>(props.followups ?? []);
    const [busyId, setBusyId] = React.useState<string | null>(null);

    // keep in sync if server refresh changes props
    React.useEffect(() => {
        setItems(props.followups ?? []);
    }, [props.followups]);

    async function markDone(followupId: string) {
        if (busyId) return;

        setBusyId(followupId);

        // ✅ optimistic remove from list
        const prev = items;
        setItems((cur) => cur.filter((f) => f.id !== followupId));

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
            // rollback
            setItems(prev);
            t.error(err?.message ?? "Failed to mark done");
            router.refresh();
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="flex flex-col gap-2">
            {items?.length ? (
                items.map((f) => (
                    <div
                        key={f.id}
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
    );
}
