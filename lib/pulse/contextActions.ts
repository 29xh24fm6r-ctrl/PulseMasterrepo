export type ContextAction = {
  key: string;
  label: string;
  href?: string; // navigation action
  intent?: "primary" | "secondary";
  keywords?: string[];
};

export type ContextActionGroup = {
  id: string;
  match: (pathname: string) => boolean;
  actions: ContextAction[];
};

function starts(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

/**
 * Deterministic, bulletproof mapping from route → actions.
 * No API calls. No user data. No risk.
 */
export const CONTEXT_ACTIONS: ContextActionGroup[] = [
  {
    id: "home",
    match: (p) => starts(p, "/home") || p === "/",
    actions: [
      { key: "go-people", label: "People", href: "/relationships", intent: "primary" },
      { key: "go-tasks", label: "Tasks", href: "/tasks", intent: "secondary" },
      { key: "go-brain", label: "Capture", href: "/brain", intent: "secondary" },
    ],
  },
  {
    id: "people",
    match: (p) => starts(p, "/crm/people") || starts(p, "/people") || starts(p, "/relationships"),
    actions: [
      { key: "add-person", label: "Add person", href: "/crm/people?open=new", intent: "primary" },
      { key: "log-touch", label: "Log touch", href: "/crm/people?open=log-touch", intent: "secondary" },
      { key: "search-people", label: "Search", href: "/relationships", intent: "secondary" },
    ],
  },
  {
    id: "deals",
    match: (p) => starts(p, "/deals") || starts(p, "/crm/deals"),
    actions: [
      { key: "new-deal", label: "New deal", href: "/deals?open=new", intent: "primary" },
      { key: "upload", label: "Upload doc", href: "/deals?open=upload", intent: "secondary" },
      { key: "next", label: "Next action", href: "/deals?view=next", intent: "secondary" },
    ],
  },
  {
    id: "tasks",
    match: (p) => starts(p, "/tasks") || starts(p, "/crm/tasks"),
    actions: [
      { key: "new-task", label: "New task", href: "/tasks?open=new", intent: "primary" },
      { key: "today", label: "Today", href: "/tasks?view=today", intent: "secondary" },
      { key: "inbox", label: "Inbox", href: "/tasks?view=inbox", intent: "secondary" },
    ],
  },
  {
    id: "brain",
    match: (p) => starts(p, "/brain") || starts(p, "/journal"),
    actions: [
      { key: "capture", label: "Capture note", href: "/brain?open=capture", intent: "primary" },
      { key: "recall", label: "Recall", href: "/brain?view=recall", intent: "secondary" },
      { key: "summarize", label: "Summarize", href: "/brain?open=summarize", intent: "secondary" },
    ],
  },
  {
    id: "ops",
    match: (p) => starts(p, "/ops"),
    actions: [
      { key: "health", label: "Health", href: "/ops/health", intent: "primary" },
      { key: "dead", label: "Dead routes", href: "/ops/dead", intent: "secondary" },
      { key: "logs", label: "Logs", href: "/ops/logs", intent: "secondary" },
    ],
  },
];

/**
 * Returns up to 3 context actions for a given pathname.
 * Always returns something sane.
 */
export function getContextActions(pathname: string): ContextAction[] {
  const group = CONTEXT_ACTIONS.find((g) => g.match(pathname));

  if (group?.actions?.length) return group.actions.slice(0, 3);

  // fallback: always useful
  return [
    { key: "fallback-search", label: "Search", href: "/home", intent: "primary" },
    { key: "fallback-people", label: "People", href: "/relationships", intent: "secondary" },
    { key: "fallback-tasks", label: "Tasks", href: "/tasks", intent: "secondary" },
  ];
}

