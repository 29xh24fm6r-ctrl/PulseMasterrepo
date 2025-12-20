// src/lib/features/registry.ts

export type FeatureKey =
  | "contacts"
  | "tasks"
  | "deals"
  | "journal"
  | "habits"
  | "intelligence"
  | "voice"
  | "notifications"
  | "simulation"
  | "create"
  | "today";

export type FeatureReadinessSpec = {
  requiresTables?: string[];
  requiresEnv?: string[];
};

export type FeatureDef = {
  key: FeatureKey;
  title: string;
  description: string;
  href: string; // where user goes when they click Open
  testable: boolean;
  readiness?: FeatureReadinessSpec;
};

export const FEATURE_REGISTRY: FeatureDef[] = [
  {
    key: "contacts",
    title: "Contacts",
    description: "People + relationship records.",
    href: "/contacts",
    testable: true,
    readiness: { requiresTables: ["crm_contacts"] },
  },
  {
    key: "tasks",
    title: "Tasks",
    description: "Personal task system with status + due dates.",
    href: "/tasks",
    testable: true,
    readiness: { requiresTables: ["tasks"] },
  },
  {
    key: "deals",
    title: "Deals",
    description: "Deal workspace + docs + workflow.",
    href: "/deals",
    testable: true,
    readiness: { requiresTables: ["deals"] },
  },
  {
    key: "journal",
    title: "Journal",
    description: "Entries, reflections, and logs.",
    href: "/journal",
    testable: true,
    readiness: { requiresTables: ["journal_entries"] },
  },
  {
    key: "habits",
    title: "Habits",
    description: "Habits + daily logs.",
    href: "/habits",
    testable: true,
    readiness: { requiresTables: ["habits"] },
  },
  {
    key: "intelligence",
    title: "Intelligence",
    description: "Entity intel runs + enrichment workflows.",
    href: "/intelligence",
    testable: true,
    // add tables as they exist in your schema
    readiness: { requiresTables: ["intel_runs"] },
  },
  {
    key: "voice",
    title: "Voice",
    description: "Voice interface + transcripts pipeline.",
    href: "/voice",
    testable: false,
    // Example env vars — change to match Pulse OS voice stack (or remove)
    readiness: { requiresEnv: [] },
  },
  {
    key: "notifications",
    title: "Notifications",
    description: "Reminders + routing.",
    href: "/notifications",
    testable: true,
    readiness: { requiresTables: ["reminder_subscriptions"] },
  },
  {
    key: "simulation",
    title: "Simulation",
    description: "What-if engine + run audit trail.",
    href: "/simulation/paths",
    testable: true,
    readiness: { requiresTables: ["simulation_runs"] },
  },
  {
    key: "create",
    title: "Create",
    description: "Universal entry point for creating contacts, tasks, deals, journal entries, and habits.",
    href: "/create",
    testable: false,
  },
  {
    key: "today",
    title: "Today",
    description: "Daily cockpit: tasks due today, recent contacts, active deals, habits, and journal prompt.",
    href: "/today",
    testable: false,
  },
];
