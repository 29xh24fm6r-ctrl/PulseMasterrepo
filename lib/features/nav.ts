// nav.ts

// Client-safe Nav Manifest: ZERO imports. Pure types + pure data.

// This file must remain registry-free to prevent transitive leaks.

export type NavItem = {
  id: string;
  label: string;
  href: string;

  // Optional UI hints (client-safe)
  icon?: string; // use string keys; map to icons in GlobalNav.tsx
  group?: string;
  description?: string;

  // Optional access hints (enforced elsewhere server-side)
  requiresAuth?: boolean;
  featureFlag?: string;
  status?: "core" | "beta" | "hidden";
};

export const NAV_ITEMS: NavItem[] = [
  // Core
  { id: "home", label: "Home", href: "/", icon: "home", group: "Core", requiresAuth: true, status: "core" },
  { id: "deals", label: "Deals", href: "/deals", icon: "deals", group: "Core", requiresAuth: true, status: "core" },
  { id: "contacts", label: "Contacts", href: "/contacts", icon: "contacts", group: "Core", requiresAuth: true, status: "core" },
  { id: "tasks", label: "Tasks", href: "/tasks", icon: "tasks", group: "Core", requiresAuth: true, status: "core" },
  { id: "followups", label: "Follow-Ups", href: "/followups", icon: "followups", group: "Core", requiresAuth: true, status: "core" },

  // Work
  { id: "work", label: "Work", href: "/work/v2", icon: "work", group: "Work", requiresAuth: true, status: "core" },
  { id: "strategy", label: "Strategy", href: "/strategy", icon: "strategy", group: "Work", requiresAuth: true, status: "beta" },
  { id: "finance", label: "Finance", href: "/finance", icon: "finance", group: "Work", requiresAuth: true, status: "beta" },

  // Relationships
  { id: "relationships", label: "Relationships", href: "/relationships/v2", icon: "relationships", group: "Relationships", requiresAuth: true, status: "core" },

  // Voice
  { id: "voice", label: "Voice", href: "/voice", icon: "voice", group: "Voice", requiresAuth: true, status: "beta" },

  // Labs
  { id: "simulation", label: "Simulation", href: "/simulation/paths", icon: "simulation", group: "Labs", requiresAuth: true, status: "beta" },
  { id: "city", label: "City", href: "/city", icon: "city", group: "Labs", requiresAuth: true, status: "beta" },
  { id: "twin", label: "Twin", href: "/twin", icon: "twin", group: "Labs", requiresAuth: true, status: "beta" },
  { id: "world", label: "World", href: "/world", icon: "world", group: "Labs", requiresAuth: true, status: "beta" },
  { id: "metaos", label: "MetaOS", href: "/metaos", icon: "metaos", group: "Labs", requiresAuth: true, status: "beta" },
  { id: "collective", label: "Collective", href: "/collective", icon: "collective", group: "Labs", requiresAuth: true, status: "beta" },
  { id: "society", label: "Society", href: "/society", icon: "society", group: "Labs", requiresAuth: true, status: "beta" },
  { id: "simulator", label: "Simulator", href: "/simulator", icon: "simulator", group: "Labs", requiresAuth: true, status: "beta" },

  // Settings
  { id: "settings", label: "Settings", href: "/settings", icon: "settings", group: "Settings", requiresAuth: true, status: "core" },
  { id: "features", label: "Features", href: "/features", icon: "features", group: "Settings", requiresAuth: true, status: "core" },

  // Ops
  { id: "ops-reliability", label: "Ops", href: "/ops/features", icon: "ops", group: "Ops", requiresAuth: true, status: "hidden" },
];

export function getNavItems(): NavItem[] {
  return NAV_ITEMS;
}

export type NavSection = {
  title: string;
  items: NavItem[];
};

const GROUP_ORDER = ["Core", "Work", "Relationships", "Voice", "Settings", "Ops", "Labs"];

const PINNED_FEATURE_IDS = [
  "home",
  "work",
  "deals",
  "tasks",
  "contacts",
  "followups",
  "features",
  "settings",
];

export function buildNavSections(opts?: { visibility?: "core" | "core+beta" | "all" }): NavSection[] {
  const visibility = opts?.visibility ?? "core+beta";

  // Filter by visibility
  let items = NAV_ITEMS.filter((item) => {
    if (visibility === "all") return true;
    if (visibility === "core+beta") return item.status !== "hidden";
    return item.status === "core";
  });

  // Remove duplicates by href (keep first)
  const seen = new Set<string>();
  const deduped: NavItem[] = [];
  for (const it of items) {
    if (seen.has(it.href)) continue;
    seen.add(it.href);
    deduped.push(it);
  }

  // Build pinned section
  const pinnedSet = new Set(PINNED_FEATURE_IDS);
  const pinned: NavItem[] = [];
  const rest: NavItem[] = [];

  for (const it of deduped) {
    if (pinnedSet.has(it.id)) pinned.push(it);
    else rest.push(it);
  }

  // Sort pinned by PINNED_FEATURE_IDS order
  pinned.sort((a, b) => PINNED_FEATURE_IDS.indexOf(a.id) - PINNED_FEATURE_IDS.indexOf(b.id));

  // Group rest by group order, then alpha by label
  const byGroup = new Map<string, NavItem[]>();
  for (const it of rest) {
    const key = it.group || "Other";
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(it);
  }
  for (const arr of byGroup.values()) arr.sort((a, b) => a.label.localeCompare(b.label));

  const sections: NavSection[] = [];

  if (pinned.length) {
    sections.push({ title: "Pinned", items: pinned });
  }

  for (const g of GROUP_ORDER) {
    const arr = byGroup.get(g);
    if (!arr?.length) continue;
    sections.push({ title: g, items: arr });
  }

  return sections;
}
