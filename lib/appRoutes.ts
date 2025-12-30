export type AppRoute = {
    href: string;
    label: string;
    group: "Home" | "Productivity" | "Work" | "Wellness" | "Growth" | "Strategy" | "Coaches" | "System" | "Labs";
    hidden?: boolean; // for dev-only routes
};

export const APP_ROUTES: AppRoute[] = [
    { href: "/life", label: "Life Intelligence", group: "Home" },
    { href: "/home", label: "Dashboard Home", group: "Home" },

    { href: "/tasks", label: "Tasks", group: "Productivity" },
    { href: "/planner", label: "Day Planner", group: "Productivity" },
    { href: "/pomodoro", label: "Focus Timer", group: "Productivity" },
    { href: "/goals", label: "Goals", group: "Productivity" },

    { href: "/work", label: "Work Command Center", group: "Work" },
    { href: "/deals", label: "Deals", group: "Work" },
    { href: "/contacts", label: "Contacts", group: "Work" },
    { href: "/follow-ups", label: "Follow-ups", group: "Work" },
    { href: "/email-intelligence", label: "Email Intelligence", group: "Work" },

    { href: "/wellness", label: "Wellness", group: "Wellness" },
    { href: "/emotions", label: "Emotions", group: "Wellness" },
    { href: "/morning", label: "Morning Routine", group: "Wellness" },
    { href: "/journal", label: "Journal", group: "Wellness" },

    { href: "/growth", label: "Growth", group: "Growth" },
    { href: "/identity", label: "Identity", group: "Growth" },
    { href: "/habits", label: "Habits", group: "Growth" },
    { href: "/achievements", label: "Achievements", group: "Growth" },
    { href: "/xp", label: "XP", group: "Growth" },

    { href: "/strategy", label: "Strategy", group: "Strategy" },
    { href: "/intelligence", label: "Insights", group: "Strategy" },
    { href: "/third-brain", label: "Third Brain", group: "Strategy" },
    { href: "/second-brain", label: "Second Brain", group: "Strategy" },

    { href: "/coaches", label: "Coaches", group: "Coaches" },
    { href: "/career-coach", label: "Career Coach", group: "Coaches" },
    { href: "/call-coach", label: "Call Coach", group: "Coaches" },
    { href: "/roleplay-coach", label: "Roleplay Coach", group: "Coaches" },

    { href: "/settings", label: "Settings", group: "System" },
    { href: "/vault", label: "Vault", group: "System" },
    { href: "/admin", label: "Admin", group: "System", hidden: true },
];
