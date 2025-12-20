// Server-only nav functions (require access context evaluation)
// lib/features/nav-server.ts

import "server-only";

import { buildNavSections, type NavSection, type NavVisibility, type NavItem } from "./nav";
import { evalGate } from "@/lib/access/gates";
import type { AccessContext } from "@/lib/access/types";
import { FEATURE_REGISTRY } from "./registry";

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

