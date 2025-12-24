export type PulseDockContext = {
  modeHint: "default" | "calls" | "deal" | "people";
  engageLabel: string;
  engageDescription: string;
  engageHref: string;
  captureHref: string;
};

function withQuery(base: string, qs: Record<string, string | undefined>) {
  const url = new URL(base, "http://local");
  Object.entries(qs).forEach(([k, v]) => {
    if (v) url.searchParams.set(k, v);
  });
  return url.pathname + (url.search ? url.search : "");
}

/**
 * Minimal, deterministic context resolver.
 * You can enrich this later by reading selected contact/deal from URL params.
 */
export function resolveDockContext(pathname: string, incoming?: { phone?: string; contactId?: string; dealId?: string }) {
  const isCalls = pathname.startsWith("/calls");
  const isDeal = pathname.startsWith("/deals/");
  const isPeople = pathname.startsWith("/crm/people") || pathname.startsWith("/people");

  // Base capture/engage targets
  const captureHref = withQuery("/live-coach", {
    autostart: "1",
    mode: "notes",
    phone: incoming?.phone,
    contactId: incoming?.contactId,
    dealId: incoming?.dealId,
  });

  const engageHrefBase = withQuery("/live-coach", {
    autostart: "1",
    mode: "hybrid",
    phone: incoming?.phone,
    contactId: incoming?.contactId,
    dealId: incoming?.dealId,
  });

  if (isCalls) {
    return {
      modeHint: "calls",
      engageLabel: "Coach this call",
      engageDescription: "Live coaching + notes for the call",
      engageHref: engageHrefBase,
      captureHref,
    } satisfies PulseDockContext;
  }

  if (isDeal) {
    return {
      modeHint: "deal",
      engageLabel: "Coach this deal",
      engageDescription: "Talk track, objections, next best move",
      engageHref: engageHrefBase,
      captureHref,
    } satisfies PulseDockContext;
  }

  if (isPeople) {
    return {
      modeHint: "people",
      engageLabel: "Coach this conversation",
      engageDescription: "Live coaching with person context",
      engageHref: engageHrefBase,
      captureHref,
    } satisfies PulseDockContext;
  }

  return {
    modeHint: "default",
    engageLabel: "Live Coach",
    engageDescription: "Starts listening + coaching immediately",
    engageHref: engageHrefBase,
    captureHref,
  } satisfies PulseDockContext;
}

