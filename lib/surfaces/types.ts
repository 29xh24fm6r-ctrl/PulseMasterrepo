/**
 * Sacred Surfaces - Shared Types
 * lib/surfaces/types.ts
 */

export type SurfaceMode = "now" | "inbox" | "pipeline" | "meetings" | "people" | "brain";

export type PulseChip = { label: "Focus" | "Risk" | "Opportunity"; value: string };

export type AdaptiveProof = {
  shownBecause?: string[]; // short bullets explaining why this is here
  hiddenBecause?: string[]; // optional future use
};

export type LeverageItem = {
  id: string;
  type: "followup" | "meeting" | "deal" | "inbox" | "loop" | "task" | "relationship";
  title: string;
  why?: string;
  severity: number; // 0-100
  href?: string;
  primaryAction?: { label: string; href?: string; action?: string };
  proof?: AdaptiveProof;
};

export type LifeSignal = {
  domain: "Time" | "Work" | "People" | "Money" | "Mind" | "Memory";
  metric: string;
  insight: string;
  cta?: { label: string; href?: string; action?: string };
  proof?: AdaptiveProof;
};

export type StreamCard = {
  id: string;
  type: "email" | "meeting" | "deal" | "task" | "loop" | "relationship";
  title: string;
  delta?: string; // what changed
  why?: string; // why it matters
  severity: number; // 0-100
  href?: string;
  context?: { contactId?: string; orgId?: string; dealId?: string; threadId?: string; eventId?: string };
  actions?: Array<{ label: string; href?: string; action?: string }>;
  proof?: AdaptiveProof;
};

export type NextBestAction = {
  title: string;
  label: string;
  href?: string;
  action?: string;
  why?: string;
  confidence?: number; // 0-100
  proof?: AdaptiveProof;
};

export type MomentumPayload = {
  score: number; // 0-100
  trend: "UP" | "FLAT" | "DOWN";
  headline: string; // short label
  insight: string; // one-liner
  cta?: { label: string; href?: string; action?: string };
  proof?: AdaptiveProof;
};

export type WisdomHighlight = {
  id: string;
  title: string;
  summary?: string | null;
  domain?: string | null;
  strength?: number; // 0-1
  usefulness?: number; // 0-1
  doText?: string; // extracted from recommendation
  avoidText?: string; // extracted from avoid
  proof?: AdaptiveProof;
};

export type HomeSurfacePayload = {
  state: { sentence: string; chips: PulseChip[] };
  leverage: LeverageItem[];
  signals: LifeSignal[];
  next?: NextBestAction | null;
  activity?: StreamCard[];
  momentum?: MomentumPayload | null;
  wisdom?: WisdomHighlight | null;
  flash?: { type: "WIN" | "SAVE" | "BREAKTHROUGH" | "STREAK"; title: string; subtitle?: string; confetti?: boolean } | null;
};

export type ContextMindPayload = {
  entity?: { type: "contact" | "org" | "deal" | "thread" | "event"; id: string; title?: string };
  summary?: string;
  timeline?: Array<{ id: string; when: string; text: string }>;
  brainHighlights?: Array<{ id: string; text: string }>;
  intelSummary?: string;
  nextBestAction?: { label: string; href?: string; action?: string };
  coach?: { name: string; note: string; confidence: number; expandable?: boolean };
};

export type WorkspaceSurfacePayload = {
  mode: SurfaceMode;
  stream: StreamCard[];
  selected?: ContextMindPayload;
};
