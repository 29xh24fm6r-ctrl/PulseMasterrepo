// AR Types (shared between server and client)
// lib/ar/types.ts

export interface ARContext {
  todaysState: {
    emotion: string;
    intensity: number;
    energy: number;
  };
  priorities: Array<{ id: string; title: string; priority: number }>;
  energyCurve: Array<{ time: string; level: number }>;
  relationshipTouch: {
    id: string;
    name: string;
    strength: number;
    action: string;
  } | null;
  opportunity: {
    id: string;
    title: string;
    description: string;
  } | null;
  risk: {
    id: string;
    title: string;
    description: string;
    severity: "low" | "medium" | "high";
  } | null;
}

