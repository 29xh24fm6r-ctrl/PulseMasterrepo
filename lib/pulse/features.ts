export type PulseFeature = {
  key: string;
  label: string;
  href: string;
  description?: string;
  keywords?: string[];
  group:
    | "Home"
    | "Work"
    | "People"
    | "Time"
    | "Brain"
    | "Decisions"
    | "Loops"
    | "Coaches"
    | "Admin";
};

export const PULSE_FEATURES: PulseFeature[] = [
  { key: "home", label: "Home", href: "/home", group: "Home", keywords: ["dashboard", "state"] },

  { key: "workspace", label: "Workspace", href: "/workspace", group: "Work", keywords: ["active self", "projects"] },
  { key: "deals", label: "Deals", href: "/deals", group: "Work", keywords: ["pipeline", "credit", "lending"] },

  { key: "people", label: "People", href: "/relationships", group: "People", keywords: ["contacts", "relationships", "crm"] },

  { key: "time", label: "Time", href: "/time", group: "Time", keywords: ["calendar", "capacity"] },
  { key: "tasks", label: "Tasks", href: "/tasks", group: "Time", keywords: ["todo", "next actions"] },

  { key: "brain", label: "Brain", href: "/brain", group: "Brain", keywords: ["memory", "intel", "notes"] },
  { key: "journal", label: "Journal", href: "/journal", group: "Brain", keywords: ["reflection", "log"] },

  { key: "decisions", label: "Decisions", href: "/decisions", group: "Decisions", keywords: ["resolution engine"] },

  { key: "loops", label: "Loops", href: "/loops", group: "Loops", keywords: ["stress", "habits"] },

  { key: "coaches", label: "Coaches", href: "/coaches", group: "Coaches", keywords: ["lenses", "dojo"] },

  { key: "ops", label: "Ops", href: "/ops", group: "Admin", keywords: ["health", "system"] },
];

