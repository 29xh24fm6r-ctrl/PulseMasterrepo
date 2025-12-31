import "server-only";

export type TriageSuggestion = {
    triage_status: "new" | "needs_reply" | "to_do" | "waiting" | "done" | "ignored";
    triage_priority: "low" | "normal" | "high";
    suggested_action: "create_task" | "create_follow_up" | "reply" | "archive" | null;
    suggested_due_at: string | null;
    reason: string;
};

function isoPlusHours(baseIso: string | null, hours: number): string | null {
    if (!baseIso) return null;
    const d = new Date(baseIso);
    if (isNaN(d.getTime())) return null;
    d.setHours(d.getHours() + hours);
    return d.toISOString();
}

export function suggestTriage(item: {
    from_email: string | null;
    subject: string | null;
    snippet: string | null;
    body: string | null;
    received_at: string | null;
}): TriageSuggestion {
    const subject = (item.subject ?? "").toLowerCase();
    const snippet = (item.snippet ?? "").toLowerCase();
    const text = `${subject}\n${snippet}`;

    // high urgency keywords
    const urgent =
        text.includes("urgent") ||
        text.includes("asap") ||
        text.includes("past due") ||
        text.includes("overdue") ||
        text.includes("deadline");

    // money / invoice
    const money =
        text.includes("invoice") ||
        text.includes("payment") ||
        text.includes("wire") ||
        text.includes("statement");

    // meeting / scheduling
    const meeting =
        text.includes("meeting") ||
        text.includes("schedule") ||
        text.includes("calendar") ||
        text.includes("call");

    if (urgent) {
        return {
            triage_status: "needs_reply",
            triage_priority: "high",
            suggested_action: "reply",
            suggested_due_at: isoPlusHours(item.received_at, 2),
            reason: "urgent_keywords",
        };
    }

    if (money) {
        return {
            triage_status: "to_do",
            triage_priority: "high",
            suggested_action: "create_task",
            suggested_due_at: isoPlusHours(item.received_at, 24),
            reason: "billing_keywords",
        };
    }

    if (meeting) {
        return {
            triage_status: "needs_reply",
            triage_priority: "normal",
            suggested_action: "reply",
            suggested_due_at: isoPlusHours(item.received_at, 24),
            reason: "meeting_keywords",
        };
    }

    return {
        triage_status: "new",
        triage_priority: "normal",
        suggested_action: null,
        suggested_due_at: null,
        reason: "default",
    };
}
