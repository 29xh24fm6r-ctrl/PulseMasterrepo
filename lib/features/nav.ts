import { FEATURE_REGISTRY } from "./registry";
import type { FeatureDef } from "./types";
import { evalGate } from "@/lib/access/gates";
import type { AccessContext } from "@/lib/access/types";

export type NavVisibility = "core" | "core+beta" | "all";

export type NavItem = {
  id: string;
  label: string;
  href: string;
  group: FeatureDef["group"];
  status: FeatureDef["status"];
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

const GROUP_ORDER: FeatureDef["group"][] = [
  "Core",
  "Work",
  "Relationships",
  "Voice",
  "Settings",
  "Ops",
  "Labs",
];

// Manual pins appear first (if present & visible)
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

// Optional: label overrides for nav (keeps registry names intact)
const NAV_LABEL_OVERRIDES: Record<string, string> = {
  followups: "Follow-Ups",
  features: "Features",
};

function firstUsableHref(f: FeatureDef): string | null {
  if (!f.links?.length) return null;

  // Prefer "Open" link if present
  const open = f.links.find((l) => l.label.toLowerCase() === "open");
  return (open?.href || f.links[0]?.href) ?? null;
}

function isVisible(f: FeatureDef, visibility: NavVisibility) {
  if (visibility === "all") return true;
  if (visibility === "core+beta") return f.status !== "hidden";
  // core only
  return f.status === "core";
}

function toNavItem(f: FeatureDef): NavItem | null {
  const href = firstUsableHref(f);
  if (!href) return null;

  return {
    id: f.id,
    label: NAV_LABEL_OVERRIDES[f.id] || f.name,
    href,
    group: f.group,
    status: f.status,
  };
}

export function buildNavSections(opts?: { visibility?: NavVisibility }): NavSection[] {
  const visibility = opts?.visibility ?? "core+beta";

  const items = FEATURE_REGISTRY
    .filter((f) => isVisible(f, visibility))
    .map(toNavItem)
    .filter(Boolean) as NavItem[];

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
    const key = it.group;
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

export async function buildNavSectionsForUser(
  ctx: AccessContext,
  opts?: { visibility?: NavVisibility; lockInsteadOfHide?: boolean }
): Promise<NavSection[]> {
  const visibility = opts?.visibility ?? "core+beta";
  const lockInsteadOfHide = opts?.lockInsteadOfHide ?? true;

  const sections = buildNavSections({ visibility });

  // Filter or lock items by gate
  const locked = (it: NavItem, reason: string) => ({ ...it, locked: true, lockedReason: reason } as NavItem & { locked: boolean; lockedReason: string });

  const out = sections
    .map((sec) => {
      const items = sec.items
        .map((it) => {
          const f = FEATURE_REGISTRY.find((x) => x.id === it.id);
          const r = evalGate(f?.gate, ctx);
          if (r.ok) return it;
          return lockInsteadOfHide ? locked(it, f?.locked_copy || r.reason) : null;
        })
        .filter(Boolean) as NavItem[];

      return { ...sec, items };
    })
    .filter((sec) => sec.items.length);

  return out;
}

