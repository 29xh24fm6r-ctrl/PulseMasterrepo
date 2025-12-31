type Json = Record<string, any>;

export type InboxItem = {
    id: string;
    user_id_uuid: string;
    source: string;
    from_email: string | null;
    from_name: string | null;
    subject: string | null;
    snippet: string | null;
    body: string | null;
    received_at: string | null;
    is_unread: boolean;
    is_archived: boolean;
    triage_status?: "new" | "needs_reply" | "to_do" | "waiting" | "done" | "ignored";
    triage_priority?: "low" | "normal" | "high";
    suggested_action?: "create_task" | "create_follow_up" | "reply" | "archive" | null;
    suggested_due_at?: string | null;
    triage_meta?: any;
    meta?: any;
};

export async function getInboxItems(params?: { unread?: boolean; archived?: boolean }) {
    const sp = new URLSearchParams();
    if (typeof params?.unread === "boolean") sp.set("unread", String(params.unread));
    if (typeof params?.archived === "boolean") sp.set("archived", String(params.archived));
    const qs = sp.toString() ? `?${sp.toString()}` : "";
    return jsonFetch<{ ok: true; items: InboxItem[] }>(`/api/inbox/items${qs}`);
}

export async function seedInboxDemo() {
    return jsonFetch<{ ok: true; items: InboxItem[] }>(`/api/inbox/items/seed`, { method: "POST" });
}

export async function updateInboxItem(input: { id: string; is_unread?: boolean; is_archived?: boolean }) {
    return jsonFetch<{ ok: true; item: InboxItem }>(`/api/inbox/items/update`, {
        method: "PATCH",
        body: JSON.stringify(input),
    });
}

export async function inboxToFollowUp(input: { inboxItemId: string; title?: string; body?: string; dueAt?: string | null }) {
    return jsonFetch<{ ok: true; followUp: any }>(`/api/inbox/actions/to-follow-up`, {
        method: "POST",
        body: JSON.stringify(input),
    });
}

export async function inboxToTask(input: { inboxItemId: string; title?: string; dueAt?: string | null }) {
    return jsonFetch<{ ok: true; task: any }>(`/api/inbox/actions/to-task`, {
        method: "POST",
        body: JSON.stringify(input),
    });
}


export async function getInboxRules() {
    return jsonFetch<{ ok: true; rules: any[] }>("/api/inbox/rules");
}
export async function createInboxRule(payload: any) {
    return jsonFetch<{ ok: true; rule: any }>("/api/inbox/rules", { method: "POST", body: JSON.stringify(payload) });
}
export async function runInboxAutopilot(payload?: { limit?: number }) {
    return jsonFetch<{ ok: true; runId: string; processed: number; matched: number; actions: number }>(
        "/api/inbox/process",
        { method: "POST", body: JSON.stringify(payload ?? {}) }
    );
}


export async function suggestInboxTriage(limit?: number) {
    return jsonFetch<{ ok: true; scanned: number; updated: number }>(
        "/api/inbox/triage/suggest",
        { method: "POST", body: JSON.stringify({ limit: limit ?? 50 }) }
    );
}

export async function patchInboxTriage(input: {
    id: string;
    triage_status?: string;
    triage_priority?: string;
    suggested_action?: string | null;
    suggested_due_at?: string | null;
    triage_meta?: any;
}) {
    return jsonFetch<{ ok: true; item: any }>("/api/inbox/triage", {
        method: "PATCH",
        body: JSON.stringify(input),
    });
}

export async function getWorkQueue() {
    return jsonFetch<{
        ok: true;
        inbox: any[];
        followUpsDueToday: any[];
        tasksDueToday: any[];
        lastAutopilotRun: any | null;
        todayStart: string;
        todayEnd: string;
    }>("/api/work/queue");
}

async function jsonFetch<T>(
    input: RequestInfo | URL,
    init?: RequestInit
): Promise<T> {
    const res = await fetch(input, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(init?.headers ?? {}),
        },
        cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as any;

    if (!res.ok) {
        const msg = data?.error || data?.message || `Request failed (${res.status})`;
        throw new Error(msg);
    }

    return data as T;
}

/** FOLLOW UPS */
export type FollowUp = {
    id: string;
    user_id_uuid: string;
    status: string;
    title: string;
    body: string;
    due_at: string | null;
    source?: string | null;
    meta?: Json;
    created_at?: string;
    updated_at?: string;
};

export async function getFollowUps() {
    return jsonFetch<{ ok: true; followUps: FollowUp[] }>("/api/follow-ups");
}

export async function createFollowUp(input: {
    title?: string;
    body?: string;
    dueAt?: string | null;
    status?: string;
    source?: string;
    meta?: Json;
}) {
    return jsonFetch<{ ok: true; followUp: FollowUp }>("/api/follow-ups/create", {
        method: "POST",
        body: JSON.stringify(input),
    });
}

export async function updateFollowUpStatus(input: {
    id: string;
    status: string;
    dueAt?: string | null;
}) {
    return jsonFetch<{ ok: true; followUp: FollowUp }>(
        "/api/follow-ups/update-status",
        { method: "POST", body: JSON.stringify(input) }
    );
}

/** DEALS */
export type Deal = {
    id: string;
    user_id_uuid: string;
    stage?: string | null;
    name?: string | null;
    title?: string | null;
    amount?: number | null;
    created_at?: string;
    updated_at?: string;
    [k: string]: any;
};

export type DealStage = {
    id: string;
    key: string;
    label: string;
    sort_order: number;
};

export async function getDealsPipeline() {
    return jsonFetch<{
        ok: true;
        stages: DealStage[];
        dealsByStage: Record<string, Deal[]>;
    }>("/api/deals/pipeline");
}

export async function updateDealStage(input: { id: string; stage: string }) {
    return jsonFetch<{ ok: true; deal: Deal }>("/api/deals/update-stage", {
        method: "PATCH",
        body: JSON.stringify(input),
    });
}

export async function getDealsEnriched() {
    return jsonFetch<{ ok: true; deals: Array<Deal & { crm_row: any | null }> }>(
        "/api/deals/enriched"
    );
}

/** TASKS */
export type Task = {
    id: string;
    user_id_uuid: string;
    title: string;
    status?: string | null;
    due_at?: string | null;
    meta?: Json;
    created_at?: string;
    updated_at?: string;
    [k: string]: any;
};

export async function createTask(input: {
    title: string;
    status?: string;
    dueAt?: string | null;
    meta?: Json;
}) {
    return jsonFetch<{ ok: true; task: Task }>("/api/tasks/create", {
        method: "POST",
        body: JSON.stringify(input),
    });
}

export async function updateTask(input: {
    id: string;
    title?: string;
    status?: string;
    dueAt?: string | null;
    meta?: Json;
}) {
    return jsonFetch<{ ok: true; task: Task }>("/api/tasks/update", {
        method: "PATCH",
        body: JSON.stringify(input),
    });
}

// Execution Controls
export async function inboxQuickComplete(inboxItemId: string, archive?: boolean) {
    return jsonFetch<{ ok: true; item: any }>("/api/inbox/execute/complete", {
        method: "POST",
        body: JSON.stringify({ inboxItemId, archive: archive === true }),
    });
}

export async function inboxSnooze(inboxItemId: string, preset: "tomorrow_morning" | "in_3_days" | "next_week") {
    return jsonFetch<{ ok: true; item: any; due_at: string }>("/api/inbox/execute/snooze", {
        method: "POST",
        body: JSON.stringify({ inboxItemId, preset }),
    });
}

export async function taskQuickComplete(id: string) {
    return jsonFetch<{ ok: true; task: any }>("/api/tasks/execute/complete", {
        method: "POST",
        body: JSON.stringify({ id }),
    });
}

export async function taskSnooze(id: string, preset: "tomorrow_morning" | "in_3_days" | "next_week") {
    return jsonFetch<{ ok: true; task: any; due_at: string }>("/api/tasks/execute/snooze", {
        method: "POST",
        body: JSON.stringify({ id, preset }),
    });
}

export async function followUpQuickComplete(id: string) {
    return jsonFetch<{ ok: true; followUp: any }>("/api/follow-ups/execute/complete", {
        method: "POST",
        body: JSON.stringify({ id }),
    });
}

export async function followUpSnooze(id: string, preset: "tomorrow_morning" | "in_3_days" | "next_week") {
    return jsonFetch<{ ok: true; followUp: any; due_at: string }>("/api/follow-ups/execute/snooze", {
        method: "POST",
        body: JSON.stringify({ id, preset }),
    });
}

// Reply Drafts (stub)
export async function getReplyDraft(inboxItemId: string) {
    return jsonFetch<{ ok: true; draft: any | null }>(`/api/inbox/reply-draft?inboxItemId=${encodeURIComponent(inboxItemId)}`);
}

export async function createReplyDraft(inboxItemId: string) {
    return jsonFetch<{ ok: true; draft: any }>("/api/inbox/reply-draft", {
        method: "POST",
        body: JSON.stringify({ inboxItemId }),
    });
}

export async function updateReplyDraft(input: { id: string; subject?: string; body?: string; status?: string; meta?: any }) {
    return jsonFetch<{ ok: true; draft: any }>("/api/inbox/reply-draft", {
        method: "PATCH",
        body: JSON.stringify(input),
    });
}

export async function aiSuggestReplyDraft(inboxItemId: string) {
    return jsonFetch<{ ok: true; draft: { subject: string; body: string; meta: any } }>("/api/inbox/reply-draft/ai", {
        method: "POST",
        body: JSON.stringify({ inboxItemId }),
    });
}

export async function sendReplyDraft(draftId: string, sendAt?: string | null) {
    return jsonFetch<{ ok: true; outbox: any; reused: boolean }>("/api/inbox/reply-draft/send", {
        method: "POST",
        body: JSON.stringify({ draftId, sendAt: sendAt ?? null }),
    });
}

export async function generateDailyBrief() {
    return jsonFetch<{ ok: true; brief: any }>("/api/work/daily-brief/generate", { method: "POST" });
}

export async function getScoreboardDays() {
    return jsonFetch<{ ok: true; days: any[] }>("/api/work/scoreboard", { method: "GET" });
}
