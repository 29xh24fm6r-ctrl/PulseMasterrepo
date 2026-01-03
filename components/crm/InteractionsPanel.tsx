"use client";

import * as React from "react";
import { InteractionAddForm, InteractionItem } from "@/components/crm/InteractionAddForm";

type Interaction = {
    id: string;
    type: string;
    summary?: string | null;
    happened_at: string;
};

export function InteractionsPanel(props: {
    contactId: string;
    initial: Interaction[];
}) {
    const [items, setItems] = React.useState<(Interaction & { optimistic?: boolean })[]>(
        props.initial ?? []
    );

    React.useEffect(() => {
        setItems(props.initial ?? []);
    }, [props.initial]);

    function onOptimisticAdd(item: InteractionItem) {
        setItems((cur) => [item, ...cur]);
    }

    function onReconcile(tempId: string, realId: string) {
        setItems((cur) =>
            cur.map((it) =>
                it.id === tempId ? { ...it, id: realId, optimistic: false } : it
            )
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="font-semibold text-gray-200">Interactions</div>
                <div className="text-xs text-gray-500">{items.length} total</div>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-4">
                <InteractionAddForm
                    contactId={props.contactId}
                    onOptimisticAdd={onOptimisticAdd}
                    onReconcile={onReconcile}
                />
            </div>

            <div className="flex flex-col gap-3">
                {items?.length ? (
                    items.map((i) => (
                        <div key={i.id} className="rounded-2xl border border-gray-800 bg-gray-900/30 p-4">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold capitalize text-cyan-400">{i.type}</div>
                                <div className="text-xs text-gray-500">
                                    {new Date(i.happened_at).toLocaleString()}
                                </div>
                            </div>

                            {i.summary ? <div className="mt-2 text-sm text-gray-300">{i.summary}</div> : null}

                            {i.optimistic ? (
                                <div className="mt-2 text-xs text-yellow-500 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                                    Syncing…
                                </div>
                            ) : null}
                        </div>
                    ))
                ) : (
                    <div className="text-sm text-gray-500 italic">No interactions yet.</div>
                )}
            </div>
        </div>
    );
}
