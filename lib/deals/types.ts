// Deal Engine Types (Schema-Aligned)
// lib/deals/types.ts

export type DealStatus = "active" | "stalled" | "won" | "lost";
export type DealStage =
  | "prospecting"
  | "qualification"
  | "proposal"
  | "negotiation"
  | "contracting"
  | "closing"
  | "closed";
export type DealPriority = "low" | "medium" | "high" | "critical";
export type ParticipantRole = "buyer" | "decision_maker" | "influencer" | "blocker" | "unknown";

export interface DealParticipant {
  contactId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null; // buyer, decision_maker, etc.
  importance?: number | null;
  relationshipScores?: any; // from contact_relationship_scores
  behaviorProfile?: any; // if exists
  identityIntelSummary?: string | null; // from contact_identity_intel.summarised_identity
  playbook?: any | null; // from contact_playbooks
}

export interface DealCommItem {
  id: string;
  channel: "email" | "sms" | "call" | "voicemail";
  occurredAt: Date;
  direction: "incoming" | "outgoing" | "unknown";
  subjectOrSnippet: string;
  sentiment?: number | null;
  dealId: string | null;
}

export interface DealContext {
  deal: {
    id: string;
    name: string;
    description?: string | null;
    value?: number | null;
    status?: string | null; // active | stalled | won | lost
    stage?: string | null;
    priority?: string | null;
    dueDate?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  participants: DealParticipant[];
  comms: DealCommItem[];
  tasks: {
    id: string;
    title: string;
    status: string;
    dueAt?: Date | null;
  }[];
  lastIntel?: {
    riskSummary?: string | null;
    momentumScore?: number | null;
    generatedAt?: Date | null;
  } | null;
}

export interface DealIntelResult {
  riskSummary: string;
  blockers: { label: string; description: string }[];
  nextSteps: { label: string; description: string }[];
  stallIndicators: string[];
  momentumScore: number; // 0..1
  confidence: number; // 0..1
}

export interface DealNextActionResult {
  actionSummary: string;
  targetContactId: string | null;
  targetContactName?: string | null;
  suggestedChannel: "email" | "sms" | "call";
  suggestedMessage: string;
  rationale: string;
  confidence: number;
}

export interface DealRadarItem {
  dealId: string;
  name: string;
  value?: number | null;
  stage?: string | null;
  status?: string | null; // active | stalled | won | lost
  priority?: string | null; // low | medium | high | critical
  daysSinceLastComm?: number | null;
  openTasksCount: number;
  recentRiskSummary?: string | null;
  momentumScore?: number | null;
  riskLabel: "low" | "medium" | "high";
}

