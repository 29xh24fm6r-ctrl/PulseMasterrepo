import "server-only";

type InboxItem = {
    id: string;
    from_email: string | null;
    from_name: string | null;
    subject: string | null;
    snippet: string | null;
    body: string | null;
    received_at: string | null;
};

type Rule = {
    id: string;
    priority: number;
    enabled: boolean;
    match_from_email: string | null;
    match_subject_contains: string | null;
    match_body_contains: string | null;
    match_snippet_contains: string | null;
    action_type: string;
    action_title_template: string | null;
    action_due_minutes: number | null;
    action_status: string | null;
    action_archive: boolean;
    action_mark_read: boolean;
};

function contains(hay: string | null | undefined, needle: string | null | undefined) {
    if (!needle) return true;
    if (!hay) return false;
    return hay.toLowerCase().includes(needle.toLowerCase());
}

function eqEmail(a: string | null | undefined, b: string | null | undefined) {
    if (!b) return true;
    if (!a) return false;
    return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function matchRule(item: InboxItem, rule: Rule): boolean {
    if (!rule.enabled) return false;
    if (!eqEmail(item.from_email, rule.match_from_email)) return false;
    if (!contains(item.subject, rule.match_subject_contains)) return false;
    if (!contains(item.snippet, rule.match_snippet_contains)) return false;
    if (!contains(item.body, rule.match_body_contains)) return false;
    return true;
}

export function renderTemplate(tpl: string | null, item: InboxItem): string {
    const subject = item.subject ?? "";
    const from = item.from_name ?? item.from_email ?? "";
    const snippet = item.snippet ?? "";
    const base = tpl ?? "{{subject}}";
    return base
        .replaceAll("{{subject}}", subject)
        .replaceAll("{{from}}", from)
        .replaceAll("{{snippet}}", snippet)
        .trim() || subject || "Inbox item";
}

export function computeDueAt(item: InboxItem, dueMinutes: number | null): string | null {
    if (!dueMinutes || !item.received_at) return null;
    const d = new Date(item.received_at);
    if (isNaN(d.getTime())) return null;
    d.setMinutes(d.getMinutes() + dueMinutes);
    return d.toISOString();
}

export function pickFirstMatchingRule(item: InboxItem, rules: Rule[]): Rule | null {
    const sorted = [...rules].sort((a, b) => a.priority - b.priority);
    for (const r of sorted) {
        if (matchRule(item, r)) return r;
    }
    return null;
}
