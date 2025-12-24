import { Mic, NotebookPen, Headphones, Plus, type LucideIcon } from "lucide-react";

export type PulseDockAction = {
  id: "capture" | "engage" | "create";
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
};

export const PULSE_DOCK_ACTIONS: PulseDockAction[] = [
  {
    id: "capture",
    label: "Capture",
    description: "Quick note + recording now",
    icon: NotebookPen,
    href: "/live-coach?autostart=1&mode=notes",
  },
  {
    id: "engage",
    label: "Live Coach",
    description: "Starts listening + coaching immediately",
    icon: Headphones,
    href: "/live-coach?autostart=1&mode=hybrid",
  },
  {
    id: "create",
    label: "Create",
    description: "Add a task, deal, contact, journal, identity",
    icon: Plus,
    href: "#", // handled by opening the create panel
  },
];

export const PULSE_VOICE_ACTION = {
  id: "voice",
  label: "Voice",
  description: "Talk to Pulse in realtime",
  icon: Mic,
  href: "/realtime-voice",
};

