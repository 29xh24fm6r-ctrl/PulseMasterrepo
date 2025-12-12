// Intent Classifier - Processes voice/text commands
// lib/realms/intent-engine/intent-classifier.ts

import { IntentResult, IntentAction, RealmTransform, NodeFilter, OverlayConfig } from "./types";
import { RealmId } from "../realm-engine/types";

export function classifyIntent(text: string): IntentResult {
  const t = text.toLowerCase().trim();

  // Navigate to realm
  const realmKeywords: Record<RealmId, string[]> = {
    life: ["life", "overall", "everything", "dashboard"],
    productivity: ["productivity", "tasks", "focus", "get things done", "todo"],
    work: ["work", "deals", "sales", "business", "job", "career"],
    growth: ["growth", "level up", "improve", "next level", "ascension"],
    wellness: ["wellness", "health", "stress", "energy", "vitality"],
    relationships: ["relationships", "people", "contacts", "friends", "network"],
    finance: ["finance", "money", "budget", "spending", "financial"],
  };

  for (const [realm, keywords] of Object.entries(realmKeywords)) {
    if (keywords.some((keyword) => t.includes(keyword))) {
      return {
        action: "navigate_realm",
        confidence: 0.9,
        targetRealm: realm as RealmId,
        message: `Navigating to ${realm}...`,
      };
    }
  }

  // Focus on node
  if (t.includes("show") || t.includes("focus") || t.includes("highlight")) {
    const nodeMatch = t.match(/(focus|task|emotion|xp|relationship|money|goal)/);
    if (nodeMatch) {
      return {
        action: "focus_node",
        confidence: 0.85,
        nodeType: nodeMatch[1],
        message: `Focusing on ${nodeMatch[1]}...`,
      };
    }
  }

  // Create node
  if (t.includes("add") || t.includes("create") || t.includes("new")) {
    const nodeMatch = t.match(/(focus|task|goal|reminder)/);
    if (nodeMatch) {
      return {
        action: "create_node",
        confidence: 0.8,
        nodeType: nodeMatch[1] === "reminder" ? "task" : nodeMatch[1],
        message: `Creating ${nodeMatch[1]}...`,
      };
    }
  }

  // Transform realm
  if (t.includes("calm") || t.includes("relax") || t.includes("peaceful")) {
    return {
      action: "transform_realm",
      confidence: 0.9,
      transform: {
        atmosphere: {
          fogColor: "#1e3a5f",
          fogDensity: 0.2,
        },
        nodeBehavior: {
          pulse: false,
          glow: true,
          scale: 0.9,
        },
      },
      message: "Transforming realm to calm mode...",
    };
  }

  if (t.includes("energize") || t.includes("excite") || t.includes("boost")) {
    return {
      action: "transform_realm",
      confidence: 0.9,
      transform: {
        atmosphere: {
          fogColor: "#4a2c2a",
          fogDensity: 0.4,
        },
        nodeBehavior: {
          pulse: true,
          glow: true,
          scale: 1.2,
        },
      },
      message: "Energizing realm...",
    };
  }

  // Filter nodes
  if (t.includes("show only") || t.includes("filter") || t.includes("hide")) {
    const filterMatch = t.match(/(urgent|active|complete|tasks|focus|emotions)/);
    if (filterMatch) {
      const filter: NodeFilter = {};
      if (filterMatch[1] === "urgent" || filterMatch[1] === "active" || filterMatch[1] === "complete") {
        filter.signal = filterMatch[1];
      } else if (filterMatch[1] === "tasks") {
        filter.type = "task";
      } else if (filterMatch[1] === "focus") {
        filter.type = "focus";
      } else if (filterMatch[1] === "emotions") {
        filter.type = "emotion";
      }

      return {
        action: "filter_nodes",
        confidence: 0.85,
        filter,
        message: `Filtering nodes...`,
      };
    }
  }

  // Cluster nodes
  if (t.includes("group") || t.includes("cluster") || t.includes("organize")) {
    return {
      action: "cluster_nodes",
      confidence: 0.8,
      message: "Clustering nodes...",
    };
  }

  // Show overlay
  if (t.includes("details") || t.includes("info") || t.includes("tell me about")) {
    return {
      action: "show_overlay",
      confidence: 0.8,
      overlay: {
        type: "detail",
        content: {},
      },
      message: "Showing details...",
    };
  }

  // Unknown
  return {
    action: "unknown",
    confidence: 0.3,
    message: "I'm not sure what you mean. Try asking about a realm or to focus on something.",
  };
}



