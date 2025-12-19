import type { FeatureDef } from "./types";

/**
 * Manual overrides and hand-authored features.
 * - Use this to rename features, add descriptions, adjust status, add extra links/APIs.
 * - Keep this small; the generator should carry most of the load.
 */
export const MANUAL_FEATURE_OVERRIDES: Partial<FeatureDef & { id: string }>[] = [
  {
    id: "home",
    name: "Home Dashboard",
    description: "Daily cockpit across tasks, deals, follow-ups, insights.",
    status: "core",
    group: "Core",
    gate: { kind: "auth" },
  },
  {
    id: "work",
    name: "Work Dashboard",
    description: "Work-centric cockpit and execution focus.",
    status: "core",
    group: "Work",
    gate: { kind: "auth" },
  },
  {
    id: "deals",
    name: "Deals",
    description: "Deal workspace and document workflow.",
    status: "core",
    group: "Work",
    gate: { kind: "plan", min: "pro" },
    locked_copy: "Deals workspace is a Pro feature. Upgrade to unlock.",
  },
  {
    id: "features",
    name: "Feature Hub",
    description: "Everything in Pulse, guaranteed reachable.",
    status: "core",
    group: "Core",
    gate: { kind: "auth" },
  },
  {
    id: "voice",
    name: "Voice",
    description: "Voice assistant + TTS.",
    status: "beta",
    group: "Voice",
    gate: { kind: "flag", flag: "voice_beta" },
    locked_copy: "Voice is in beta. Request access to unlock.",
  },
  {
    id: "settings",
    name: "Settings",
    description: "Billing, personas, voice, teaching, system preferences.",
    status: "core",
    group: "Settings",
    gate: { kind: "auth" },
    links: [
      { label: "Open", href: "/settings" },
      { label: "Billing", href: "/settings/billing" },
      { label: "Personas", href: "/settings/personas" },
      { label: "Teaching", href: "/settings/teaching" },
      { label: "Voice Settings", href: "/voice-settings" },
    ],
  },
  {
    id: "scheduler-admin",
    name: "Scheduler Admin",
    description: "Job queue control plane and golden path tests.",
    status: "core",
    group: "Ops",
    gate: { kind: "role", anyOf: ["admin", "ops"] },
    locked_copy: "Ops dashboards require admin access.",
  },
  {
    id: "ops-reliability",
    name: "Reliability",
    description: "24h job reliability metrics.",
    status: "core",
    group: "Ops",
    gate: { kind: "role", anyOf: ["admin", "ops"] },
    locked_copy: "Ops dashboards require admin access.",
  },
  {
    id: "ops-dead-sweeper",
    name: "Dead Sweeper",
    description: "Remove/repair/prioritize report for features + APIs.",
    status: "core",
    group: "Ops",
    links: [{ label: "Open", href: "/ops/dead-sweeper" }],
    gate: { kind: "role", anyOf: ["admin", "ops"] },
    locked_copy: "Ops dashboards require admin access.",
  },
  {
    id: "notion",
    status: "hidden",
    name: "Notion (deprecated)",
    description: "Removed. Supabase is the official database.",
  },
] as any;

