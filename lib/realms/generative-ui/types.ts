// Generative UI Types - Contextual overlays
// lib/realms/generative-ui/types.ts

import { SemanticNode } from "../node-engine/types";

export type OverlayType = "detail" | "action" | "insight" | "warning" | "creation" | "confirmation";

export interface OverlayConfig {
  id: string;
  type: OverlayType;
  nodeId?: string;
  position: { x: number; y: number };
  content: OverlayContent;
  duration?: number; // Auto-dismiss after ms
  dismissible?: boolean;
}

export interface OverlayContent {
  title?: string;
  description?: string;
  actions?: OverlayAction[];
  data?: any;
  component?: string; // Component name to render
}

export interface OverlayAction {
  label: string;
  action: () => void;
  variant?: "primary" | "secondary" | "danger";
}

export interface OverlayState {
  overlays: OverlayConfig[];
  activeOverlayId?: string;
}



