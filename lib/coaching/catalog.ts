// Coach Catalog
// lib/coaching/catalog.ts

export type CoachKey =
  | "confidant"          // emotional support / processing
  | "career"             // job mastery + advancement
  | "sales"              // deals, pipeline, conversations
  | "financial"          // money, cashflow, goals
  | "strategy"           // life/career strategy
  | "productivity"       // task management, focus
  | "pulse_guide"        // how to use Pulse
  | "general";            // generic helper fallback

export interface CoachDefinition {
  key: CoachKey;
  name: string;
  shortLabel: string;
  tagline: string;
  icon: string;           // lucide icon name
  primaryColor: string;    // tailwind color token
}

export const COACHES: CoachDefinition[] = [
  {
    key: "confidant",
    name: "Confidant",
    shortLabel: "Confidant",
    tagline: "A safe space to process emotions and reflect",
    icon: "Heart",
    primaryColor: "rose",
  },
  {
    key: "career",
    name: "Career Coach",
    shortLabel: "Career Coach",
    tagline: "Master your craft and advance your career",
    icon: "Briefcase",
    primaryColor: "blue",
  },
  {
    key: "sales",
    name: "Sales Coach",
    shortLabel: "Sales Coach",
    tagline: "Close deals and build relationships",
    icon: "TrendingUp",
    primaryColor: "purple",
  },
  {
    key: "financial",
    name: "Financial Coach",
    shortLabel: "Financial Coach",
    tagline: "Understand your money and make smart decisions",
    icon: "DollarSign",
    primaryColor: "green",
  },
  {
    key: "strategy",
    name: "Strategy Coach",
    shortLabel: "Strategy Coach",
    tagline: "Navigate your 90-day plan and life direction",
    icon: "Compass",
    primaryColor: "violet",
  },
  {
    key: "productivity",
    name: "Productivity Coach",
    shortLabel: "Productivity Coach",
    tagline: "Focus, prioritize, and get things done",
    icon: "Zap",
    primaryColor: "yellow",
  },
  {
    key: "pulse_guide",
    name: "Pulse Guide",
    shortLabel: "Pulse Guide",
    tagline: "Here to help you use Pulse.",
    icon: "Compass",
    primaryColor: "sky",
  },
  {
    key: "general",
    name: "Pulse Assistant",
    shortLabel: "Assistant",
    tagline: "Your general helper and guide",
    icon: "MessageSquare",
    primaryColor: "zinc",
  },
];

export function getCoachDef(key: CoachKey): CoachDefinition {
  return COACHES.find((c) => c.key === key) || COACHES.find((c) => c.key === "general")!;
}

