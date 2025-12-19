// lib/features/api-ownership.manual.ts

export type ApiOwnershipRule = {
  feature_id: string;
  // Prefix match (best for whole feature namespaces)
  prefix?: string;
  // Exact match (best for one-offs)
  exact?: string;
};

export const API_OWNERSHIP_RULES: ApiOwnershipRule[] = [
  // Analytics
  { feature_id: "analytics", prefix: "/api/analytics" },

  // Dashboard / home
  { feature_id: "home", exact: "/api/dashboard/config" },
  { feature_id: "calendar", prefix: "/api/calendar" },

  // Tasks / follow-ups
  { feature_id: "tasks", prefix: "/api/tasks" },
  { feature_id: "follow-ups", prefix: "/api/follow-ups" },

  // Deals
  { feature_id: "deals", prefix: "/api/deals" },

  // CRM core
  { feature_id: "crm", prefix: "/api/crm" },

  // Command / ops
  { feature_id: "command", prefix: "/api/command" },
  { feature_id: "ops", prefix: "/api/ops" },

  // Voice
  { feature_id: "voice", prefix: "/api/voice" },

  // Intel / research
  { feature_id: "intel", prefix: "/api/intel" },
  { feature_id: "research", prefix: "/api/research" },

  // Plugins (new)
  { feature_id: "plugins", exact: "/api/plugins" },

  // Pulse core heartbeat
  { feature_id: "pulse", exact: "/api/pulse" },

  // Simulation / life intelligence
  { feature_id: "life-intelligence", prefix: "/api/simulation" },
];

