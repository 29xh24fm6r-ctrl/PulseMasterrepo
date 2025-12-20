// Person Dossier Types (shared between server and client)
// lib/people/dossier-types.ts

export interface PersonDossier {
  ok: boolean;
  person: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    tags?: string[];
  };
  intelligence: {
    healthScore: number;
    healthLabel: "new" | "healthy" | "cooling" | "at_risk";
    lastInteractionAt?: string | null;
    daysSinceLastTouch?: number | null;
    cadenceLabel?: string | null;
    pulseSummary: string;
    needsTouchReason?: string | null;
    nextBestActions: Array<{ label: string; action: "note" | "task" | "deal" | "followup" | "email" }>;
  };
  timeline: Array<{
    id: string;
    type: "note" | "email" | "meeting" | "task" | "deal";
    title: string;
    body?: string | null;
    at: string;
    href?: string | null;
  }>;
  crm: {
    deals: Array<{ id: string; title: string; stage?: string | null; amount?: number | null; updatedAt?: string | null }>;
    tasks: Array<{ id: string; title: string; dueAt?: string | null; status: "open" | "done" }>;
    followups: Array<{ id: string; title: string; dueAt?: string | null; status: "open" | "done" }>;
  };
  meta?: Record<string, any>;
}
