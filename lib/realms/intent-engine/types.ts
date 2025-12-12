// Intent Engine Types - Voice/text command processing
// lib/realms/intent-engine/types.ts

import { RealmId } from "../realm-engine/types";
import { SemanticNode } from "../node-engine/types";

export type IntentAction =
  | "navigate_realm"
  | "focus_node"
  | "create_node"
  | "transform_realm"
  | "filter_nodes"
  | "cluster_nodes"
  | "animate_nodes"
  | "show_overlay"
  | "hide_overlay"
  | "unknown";

export interface IntentResult {
  action: IntentAction;
  confidence: number;
  targetRealm?: RealmId;
  targetNodeId?: string;
  nodeType?: string;
  transform?: RealmTransform;
  filter?: NodeFilter;
  overlay?: OverlayConfig;
  message?: string;
}

export interface RealmTransform {
  camera?: {
    position?: [number, number, number];
    target?: [number, number, number];
  };
  atmosphere?: {
    fogColor?: string;
    fogDensity?: number;
  };
  nodeBehavior?: {
    pulse?: boolean;
    glow?: boolean;
    scale?: number;
  };
}

export interface NodeFilter {
  type?: string;
  signal?: string;
  domain?: string;
  priority?: number;
}

export interface OverlayConfig {
  type: "detail" | "action" | "insight" | "warning";
  nodeId?: string;
  content: any;
  position?: { x: number; y: number };
}



