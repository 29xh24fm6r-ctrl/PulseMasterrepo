/**
 * Shared overview helper functions
 */

export function emptyOverview(module: string, summary: string): any {
  return {
    ok: true,
    module,
    summary,
    cards: [
      { title: "Not wired yet", subtitle: "Connect data sources to populate this module.", state: "empty" },
      { title: "Next step", subtitle: "Add your first item to get started.", state: "empty", cta: { label: "Get Started", href: `/${module}` } }
    ],
    items: [],
    meta: {},
  };
}

