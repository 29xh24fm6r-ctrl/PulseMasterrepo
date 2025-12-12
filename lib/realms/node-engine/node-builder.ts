// Node Builder - Creates semantic nodes from system data
// lib/realms/node-engine/node-builder.ts

import { SemanticNode, NodeType, NodeSignal, NodeMetadata, NodeBehavior, NodeInteraction } from "./types";

export interface NodeBuilderConfig {
  type: NodeType;
  metadata: NodeMetadata;
  signal?: NodeSignal;
  behavior?: Partial<NodeBehavior>;
  interaction?: Partial<NodeInteraction>;
}

export function buildSemanticNode(config: NodeBuilderConfig): SemanticNode {
  const {
    type,
    metadata,
    signal = "idle",
    behavior = {},
    interaction = {},
  } = config;

  // Default behaviors based on node type
  const defaultBehaviors: Record<NodeType, NodeBehavior> = {
    focus: { pulse: true, float: true, scale: 1.2 },
    emotion: { glow: true, pulse: true, scale: 1.0 },
    xp: { rotate: true, glow: true, scale: 0.8 },
    task: { pulse: true, float: false, scale: 0.9 },
    relationship: { float: true, glow: true, scale: 1.1 },
    finance: { pulse: false, glow: true, scale: 1.0 },
    goal: { pulse: true, float: true, scale: 1.3 },
    insight: { glow: true, pulse: true, scale: 0.7 },
    risk: { pulse: true, glow: true, scale: 1.1 },
    opportunity: { float: true, glow: true, pulse: true, scale: 1.2 },
  };

  // Default colors based on type and signal
  const getColor = (nodeType: NodeType, nodeSignal: NodeSignal): string => {
    const colorMap: Record<NodeType, Record<NodeSignal, string>> = {
      focus: { idle: "#a855f7", active: "#ec4899", urgent: "#f97316", complete: "#10b981", warning: "#ef4444" },
      emotion: { idle: "#8b5cf6", active: "#ec4899", urgent: "#f97316", complete: "#06b6d4", warning: "#ef4444" },
      xp: { idle: "#fbbf24", active: "#f59e0b", urgent: "#f97316", complete: "#10b981", warning: "#ef4444" },
      task: { idle: "#6366f1", active: "#8b5cf6", urgent: "#f97316", complete: "#10b981", warning: "#ef4444" },
      relationship: { idle: "#ec4899", active: "#f472b6", urgent: "#f97316", complete: "#10b981", warning: "#ef4444" },
      finance: { idle: "#06b6d4", active: "#10b981", urgent: "#f97316", complete: "#10b981", warning: "#ef4444" },
      goal: { idle: "#a855f7", active: "#ec4899", urgent: "#f97316", complete: "#10b981", warning: "#ef4444" },
      insight: { idle: "#8b5cf6", active: "#ec4899", urgent: "#f97316", complete: "#10b981", warning: "#ef4444" },
      risk: { idle: "#ef4444", active: "#f97316", urgent: "#dc2626", complete: "#10b981", warning: "#dc2626" },
      opportunity: { idle: "#10b981", active: "#14b8a6", urgent: "#f97316", complete: "#10b981", warning: "#ef4444" },
    };
    return colorMap[nodeType]?.[nodeSignal] || "#8b5cf6";
  };

  const defaultBehavior = defaultBehaviors[type] || {};
  const mergedBehavior = { ...defaultBehavior, ...behavior };

  return {
    id: metadata.id,
    type,
    signal,
    metadata,
    behavior: mergedBehavior,
    interaction: interaction as NodeInteraction,
    size: mergedBehavior.scale || 1.0,
    color: getColor(type, signal),
    glowColor: getColor(type, signal),
  };
}

export function buildNodeFromFocus(focus: any): SemanticNode {
  return buildSemanticNode({
    type: "focus",
    metadata: {
      id: focus.id || `focus-${Date.now()}`,
      type: "focus",
      label: focus.title || focus.name || "Focus",
      value: focus.priority || 0,
      timestamp: focus.created_at || new Date().toISOString(),
    },
    signal: focus.urgent ? "urgent" : focus.completed ? "complete" : "active",
    behavior: {
      pulse: true,
      float: true,
      scale: focus.urgent ? 1.3 : 1.2,
    },
  });
}

export function buildNodeFromEmotion(emotion: any): SemanticNode {
  return buildSemanticNode({
    type: "emotion",
    metadata: {
      id: `emotion-${Date.now()}`,
      type: "emotion",
      label: emotion.detected_emotion || "Neutral",
      value: emotion.intensity || 0.5,
      timestamp: emotion.occurred_at || new Date().toISOString(),
    },
    signal: emotion.intensity > 0.7 ? "active" : "idle",
    behavior: {
      glow: true,
      pulse: emotion.intensity > 0.7,
      scale: 1.0 + (emotion.intensity || 0) * 0.3,
    },
  });
}

export function buildNodeFromXP(xp: any): SemanticNode {
  return buildSemanticNode({
    type: "xp",
    metadata: {
      id: `xp-${Date.now()}`,
      type: "xp",
      label: "XP",
      value: xp.total || xp.amount || 0,
      timestamp: new Date().toISOString(),
    },
    signal: xp.recentGain ? "active" : "idle",
    behavior: {
      rotate: true,
      glow: true,
      scale: 0.8,
    },
  });
}



