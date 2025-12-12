// Realm Configuration
// lib/realms/config.ts

export interface RealmConfig {
  id: string;
  label: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  bgGradient: [string, string, string]; // [top, middle, bottom]
  icon: string;
  route: string;
}

export const REALMS: Record<string, RealmConfig> = {
  life: {
    id: "life",
    label: "Life Core",
    tagline: "Your life at a glance.",
    primaryColor: "#a855f7",
    accentColor: "#ec4899",
    bgGradient: ["#28003a", "#3b0764", "#0f172a"],
    icon: "Sparkles",
    route: "/life",
  },
  productivity: {
    id: "productivity",
    label: "Execution Engine",
    tagline: "Tasks, focus, time.",
    primaryColor: "#6366f1",
    accentColor: "#8b5cf6",
    bgGradient: ["#1e1b4b", "#312e81", "#0f172a"],
    icon: "Zap",
    route: "/productivity",
  },
  work: {
    id: "work",
    label: "Work Hub",
    tagline: "Deals, KPIs, performance.",
    primaryColor: "#3b82f6",
    accentColor: "#06b6d4",
    bgGradient: ["#1e3a5f", "#1e40af", "#0f172a"],
    icon: "Briefcase",
    route: "/work",
  },
  growth: {
    id: "growth",
    label: "Ascension Chamber",
    tagline: "Levels, missions, transformation.",
    primaryColor: "#f97316",
    accentColor: "#fbbf24",
    bgGradient: ["#4a2c2a", "#7c2d12", "#0f172a"],
    icon: "TrendingUp",
    route: "/growth",
  },
  wellness: {
    id: "wellness",
    label: "Vitality Lab",
    tagline: "Health, energy, stress.",
    primaryColor: "#10b981",
    accentColor: "#14b8a6",
    bgGradient: ["#064e3b", "#065f46", "#0f172a"],
    icon: "Heart",
    route: "/wellness",
  },
  relationships: {
    id: "relationships",
    label: "Connection Realm",
    tagline: "People, relationships, network.",
    primaryColor: "#ec4899",
    accentColor: "#f472b6",
    bgGradient: ["#4a1e3a", "#831843", "#0f172a"],
    icon: "Users",
    route: "/relationships",
  },
  finance: {
    id: "finance",
    label: "Finance System",
    tagline: "Money, budgets, goals.",
    primaryColor: "#06b6d4",
    accentColor: "#10b981",
    bgGradient: ["#164e63", "#155e75", "#0f172a"],
    icon: "DollarSign",
    route: "/finance",
  },
};

export function getRealmConfig(realmId: string): RealmConfig | undefined {
  return REALMS[realmId];
}



