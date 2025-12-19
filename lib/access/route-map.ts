import "server-only";
import { FEATURE_REGISTRY } from "@/lib/features/registry";

export function featureIdForPath(pathname: string): string | null {
  // Find the first feature whose "Open" href matches prefix
  // Prefer longest match to avoid /work matching /workspaces etc.
  const candidates: { id: string; href: string }[] = [];

  for (const f of FEATURE_REGISTRY) {
    const open = f.links?.find((l) => l.label.toLowerCase() === "open")?.href || f.links?.[0]?.href;
    if (!open) continue;
    if (open === "/" ? pathname === "/" : pathname === open || pathname.startsWith(open + "/")) {
      candidates.push({ id: f.id, href: open });
    }
  }

  candidates.sort((a, b) => b.href.length - a.href.length);
  return candidates[0]?.id || null;
}

