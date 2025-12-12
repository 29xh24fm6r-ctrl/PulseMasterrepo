// Cockpit Types - Minimal contextual widgets
// lib/realms/cockpit/types.ts

export type WidgetType = "status" | "quick_action" | "indicator" | "notification";

export interface CockpitWidget {
  id: string;
  type: WidgetType;
  label: string;
  value?: string | number;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  onClick?: () => void;
  visible: boolean;
}

export interface CockpitState {
  widgets: CockpitWidget[];
  minimized: boolean;
}



