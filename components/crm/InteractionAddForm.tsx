"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { crmAddInteraction } from "@/lib/client/crmClient";
import { useToast } from "@/components/ui/ToastProvider";

export type InteractionItem = {
    id: string;
    type: string;
    summary?: string | null;
    happened_at: string;
    optimistic?: boolean;
};

function tempId() {
    return "temp_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function InteractionAddForm(props: {
    contactId: string;
    onOptimisticAdd: (item: InteractionItem) => void;
    onReconcile?: (tempId: string, realId: string) => void;
}) {
    const { contactId, onOptimisticAdd, onReconcile } = props;
    const router = useRouter();
    const t = useToast();

    const [type, setType] = React.useState("call");
    const [summary, setSummary] = React.useState("");
    const [saving, setSaving] = React.useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (saving) return;

        const nowIso = new Date().toISOString();
        const tmp = tempId();

        // ✅ Optimistic insert
        onOptimisticAdd({
            id: tmp,
            type,
            summary: summary.trim() ? summary.trim() : null,
            happened_at: nowIso,
            optimistic: true,
        });

        setSaving(true);

        try {
            const res = await crmAddInteraction({
                contact_id: contactId,
                type,
                summary: summary.trim() ? summary.trim() : null,
                metadata: {},
            });

            // reconcile temp -> real id (optional)
            onReconcile?.(tmp, res.interaction_id);

            t.success("Interaction added");

            // 🔥 Pull fresh server truth (Oracle feels live)
            router.refresh();

            setSummary("");
            setType("call");
        } catch (err: any) {
            t.error(err?.message ?? "Failed to add interaction");

            // fall back: refresh to undo optimistic if server rejected
            router.refresh();
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-2">
            <div className="flex gap-2">
                <select
                    className="border rounded-xl px-2 py-1 bg-gray-900 border-gray-700 text-white"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    disabled={saving}
                >
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="text">Text</option>
                    <option value="note">Note</option>
                </select>

                <button
                    className="border rounded-xl px-3 py-1 bg-cyan-600 border-cyan-500 text-white hover:bg-cyan-500"
                    type="submit"
                    disabled={saving}
                >
                    {saving ? "Saving..." : "Add"}
                </button>
            </div>

            <textarea
                className="border rounded-2xl p-2 bg-gray-900 border-gray-700 text-white placeholder-gray-500"
                placeholder="Summary / notes..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                disabled={saving}
                rows={3}
            />
        </form>
    );
}
