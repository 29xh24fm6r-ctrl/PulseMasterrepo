// Node Engine Types - Semantic 3D nodes with behavior
// lib/realms/node-engine/types.ts

export type NodeType =
  | "focus"
  | "emotion"
  | "xp"
  | "task"
  | "relationship"
  | "finance"
  | "goal"
  | "insight"
  | "risk"
  | "opportunity";

export type NodeSignal = "idle" | "active" | "urgent" | "complete" | "warning";

export interface NodeMetadata {
  id: string;
  type: NodeType;
  label: string;
  value?: string | number;
  timestamp?: string;
  domain?: string;
  priority?: number;
  [key: string]: any;
}

export interface NodeBehavior {
  pulse?: boolean;
  rotate?: boolean;
  float?: boolean;
  glow?: boolean;
  scale?: number;
  orbitRadius?: number;
  orbitSpeed?: number;
}

export interface NodeInteraction {
  onClick?: () => void;
  onHover?: () => void;
  onFocus?: () => void;
  onDismiss?: () => void;
}

export interface SemanticNode {
  id: string;
  type: NodeType;
  signal: NodeSignal;
  metadata: NodeMetadata;
  behavior: NodeBehavior;
  interaction: NodeInteraction;
  position?: { x: number; y: number; z: number };
  size?: number;
  color?: string;
  glowColor?: string;
}

export interface NodeCluster {
  id: string;
  nodes: SemanticNode[];
  center: { x: number; y: number; z: number };
  radius: number;
}



