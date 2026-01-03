export async function crmAddInteraction(input: {
    contact_id: string;
    type: string;
    channel?: string | null;
    happened_at?: string | null;
    summary?: string | null;
    metadata?: Record<string, any> | null;
}) {
    const res = await fetch("/api/crm/interactions/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.details || json?.error || "Failed to add interaction");
    return json as { interaction_id: string };
}

export async function crmMarkFollowupDone(input: {
    followup_id: string;
    contact_id: string; // required for tag revalidation
    done_at?: string | null;
    outcome?: string | null;
    notes?: string | null;
}) {
    const res = await fetch("/api/crm/followups/mark-done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.details || json?.error || "Failed to mark followup done");
    return json as { ok: true };
}
