// src/lib/email/dailyBrief.ts

type TriageItem = {
  email_thread_id: string;
  urgency: string;
  suggested_action: string;
  next_action_at: string | null;
};

type FollowupItem = {
  email_thread_id: string;
  follow_up_at: string;
  reason: string;
};

function rankUrgency(p: string) {
  if (p === "p0") return 0;
  if (p === "p1") return 1;
  if (p === "p2") return 2;
  return 3;
}

export function buildDailyBrief(items: TriageItem[], followupsDue: FollowupItem[]) {
  const sorted = [...items].sort((a, b) => rankUrgency(String(a.urgency)) - rankUrgency(String(b.urgency)));

  // Derive needs_reply from suggested_action === 'reply'
  const urgentReplies = sorted.filter((x) => x.suggested_action === "reply").slice(0, 3);
  const dueFollowups = [...followupsDue].slice(0, 3);

  const bullets: string[] = [];

  for (const r of urgentReplies) {
    bullets.push(
      `Reply needed (${String(r.urgency).toUpperCase()}): thread ${r.email_thread_id}${r.next_action_at ? ` (due ${new Date(r.next_action_at).toLocaleString()})` : ""}`
    );
  }

  for (const f of dueFollowups) {
    bullets.push(
      `Follow up: thread ${f.email_thread_id} at ${new Date(f.follow_up_at).toLocaleString()} — ${f.reason}`
    );
  }

  if (bullets.length < 7) {
    const quietWins = sorted.filter((x) => x.suggested_action === "ignore").slice(0, 1);
    for (const q of quietWins) bullets.push(`Quiet win: archive/ignore thread ${q.email_thread_id}`);
  }

  return bullets.slice(0, 7);
}
