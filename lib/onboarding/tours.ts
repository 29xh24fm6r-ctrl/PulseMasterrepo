// Tour System Definitions
// lib/onboarding/tours.ts

export type TourKey = "life_dashboard" | "work_dashboard" | "finance_page" | "relationships_page";

export interface TourStep {
  id: string;
  selector?: string;    // CSS selector for highlighted element (optional v1)
  title: string;
  body: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
}

export const TOURS: Record<TourKey, TourStep[]> = {
  life_dashboard: [
    {
      id: "today_focus",
      selector: "[data-tour='today-focus']",
      title: "Today's Focus",
      body: "This is where you'll see today's most important moves. They come from your strategy, Autopilot, and Life Arcs.",
      position: "right",
    },
    {
      id: "you_right_now",
      selector: "[data-tour='energy-mood']",
      title: "You Right Now",
      body: "Pulse tracks your energy & mood so it can suggest smart moves that match how you're feeling.",
      position: "right",
    },
    {
      id: "direction",
      selector: "[data-tour='strategy-arcs']",
      title: "Direction",
      body: "Your 30–90 day strategy and key Life Arcs live here. This is your game plan for the season.",
      position: "bottom",
    },
    {
      id: "systems_signals",
      selector: "[data-tour='systems-signals']",
      title: "Systems & Signals",
      body: "Money, relationships, insights, and Autopilot live in this band. These are the systems that keep your life running.",
      position: "bottom",
    },
    {
      id: "coaches",
      title: "Talk to a Coach Anytime",
      body: "Use these buttons throughout Pulse to talk to the right coach when you're unsure. Each coach knows your specific context.",
      position: "center",
    },
  ],
  work_dashboard: [
    {
      id: "priority_stack",
      selector: "[data-tour='priority-stack']",
      title: "Priority Stack",
      body: "Your most important tasks for today, pulled from your Life Arcs, Strategy, and Autopilot.",
      position: "right",
    },
    {
      id: "focus_mode",
      selector: "[data-tour='focus-mode']",
      title: "Focus Mode",
      body: "Select tasks and start a focused work session. Pulse will help you stay on track.",
      position: "right",
    },
    {
      id: "autopilot",
      selector: "[data-tour='autopilot']",
      title: "Autopilot Queue",
      body: "Actions Pulse suggests based on your relationships, deals, and follow-ups.",
      position: "left",
    },
  ],
  finance_page: [
    {
      id: "money_overview",
      selector: "[data-tour='money-overview']",
      title: "This Month in Money",
      body: "See your income, expenses, and cashflow at a glance. Pulse helps you understand your money patterns.",
      position: "bottom",
    },
    {
      id: "budgets_goals",
      selector: "[data-tour='budgets-goals']",
      title: "Budgets & Goals",
      body: "Set spending targets and track progress toward financial goals. Pulse gives you clarity, not judgment.",
      position: "bottom",
    },
    {
      id: "financial_coach",
      title: "Financial Coach",
      body: "Ask the Financial Coach about your money situation. They understand your full financial picture.",
      position: "center",
    },
  ],
  relationships_page: [
    {
      id: "contacts_deals",
      selector: "[data-tour='contacts-deals']",
      title: "Contacts & Deals",
      body: "See the people and deals that matter most. Pulse tracks relationship health and deal momentum.",
      position: "bottom",
    },
    {
      id: "radar",
      selector: "[data-tour='radar']",
      title: "Relationship Radar",
      body: "Who needs attention right now? Pulse highlights contacts and relationships that need a check-in.",
      position: "right",
    },
  ],
};




