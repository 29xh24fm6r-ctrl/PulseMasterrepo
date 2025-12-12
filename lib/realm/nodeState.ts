// Node State Engine - Tracks health, urgency, momentum, emotion for each node
// lib/realm/nodeState.ts

export type NodeEmotion = "neutral" | "rising" | "falling" | "blocked" | "flowing";

export interface NodeStatus {
  health: number; // 0–1 wellness or stability
  urgency: number; // 0–1 importance / time pressure
  momentum: number; // 0–1 recent progress or stagnation
  emotion: NodeEmotion;
  message?: string; // optional insight for HUD bubbles
}

export type NodeId = "focus" | "emotion" | "growth" | "health" | "finance" | "relationships";

interface NodeStateCache {
  [nodeId: string]: {
    status: NodeStatus;
    timestamp: number;
  };
}

const cache: NodeStateCache = {};
const CACHE_TTL = 30000; // 30 seconds

async function fetchNodeState(nodeId: NodeId, userId: string): Promise<NodeStatus> {
  const now = Date.now();
  
  // Check cache
  if (cache[nodeId] && now - cache[nodeId].timestamp < CACHE_TTL) {
    return cache[nodeId].status;
  }

  try {
    switch (nodeId) {
      case "focus": {
        try {
          const res = await fetch("/api/tasks/pull");
          const data = res.ok ? await res.json() : null;
          // Handle both array and object responses
          const tasks = Array.isArray(data) ? data : (data?.tasks || data?.items || []);
          const urgentTasks = Array.isArray(tasks) ? tasks.filter((t: any) => t.priority > 7 || t.due_date) : [];
          const completedToday = Array.isArray(tasks) ? tasks.filter((t: any) => t.completed && t.completed_at && new Date(t.completed_at).toDateString() === new Date().toDateString()) : [];
          
          return {
            health: tasks.length > 0 ? Math.min(1, completedToday.length / Math.max(1, tasks.length)) : 0.5,
            urgency: Math.min(1, urgentTasks.length / 5),
            momentum: completedToday.length > 0 ? 0.8 : 0.3,
            emotion: urgentTasks.length > 2 ? "blocked" : completedToday.length > 0 ? "flowing" : "neutral",
            message: tasks.length > 0 ? `${tasks.length} active tasks` : "No moves yet",
          };
        } catch (error) {
          console.error("Failed to fetch focus state:", error);
          return {
            health: 0.5,
            urgency: 0.3,
            momentum: 0.5,
            emotion: "neutral",
            message: "No moves yet",
          };
        }
      }

      case "emotion": {
        try {
          const res = await fetch("/api/emotion");
          const data = res.ok ? await res.json() : null;
          const current = data?.current || data;
          
          if (current) {
            const intensity = current.intensity || 0.5;
            const emotion = current.detected_emotion?.toLowerCase() || "neutral";
            
            let nodeEmotion: NodeEmotion = "neutral";
            if (emotion.includes("stressed") || emotion.includes("overwhelmed")) {
              nodeEmotion = "blocked";
            } else if (emotion.includes("energized") || emotion.includes("excited")) {
              nodeEmotion = "rising";
            } else if (emotion.includes("calm") || emotion.includes("peaceful")) {
              nodeEmotion = "flowing";
            } else if (emotion.includes("low") || emotion.includes("tired")) {
              nodeEmotion = "falling";
            }

            return {
              health: intensity > 0.7 ? 0.9 : intensity > 0.4 ? 0.7 : 0.5,
              urgency: intensity > 0.8 ? 0.9 : intensity > 0.6 ? 0.6 : 0.3,
              momentum: intensity > 0.7 ? 0.8 : intensity > 0.4 ? 0.5 : 0.2,
              emotion: nodeEmotion,
              message: `Energy ${intensity > 0.7 ? "trending up" : intensity > 0.4 ? "stable" : "low"}`,
            };
          }

          return {
            health: 0.6,
            urgency: 0.3,
            momentum: 0.5,
            emotion: "neutral",
            message: "Neutral",
          };
        } catch (error) {
          console.error("Failed to fetch emotion state:", error);
          return {
            health: 0.6,
            urgency: 0.3,
            momentum: 0.5,
            emotion: "neutral",
            message: "Neutral",
          };
        }
      }

      case "growth": {
        try {
          const res = await fetch("/api/xp/summary");
          const data = res.ok ? await res.json() : null;
          const weekTotal = data?.weekTotal || data?.week_total || data?.total || 0;
          const recentGain = weekTotal > 0;

          return {
            health: Math.min(1, weekTotal / 100),
            urgency: recentGain ? 0.2 : 0.5,
            momentum: recentGain ? 0.9 : 0.3,
            emotion: recentGain ? "rising" : "neutral",
            message: recentGain ? `+${weekTotal} XP this week` : "Level 1",
          };
        } catch (error) {
          console.error("Failed to fetch growth state:", error);
          return {
            health: 0.5,
            urgency: 0.3,
            momentum: 0.5,
            emotion: "neutral",
            message: "Level 1",
          };
        }
      }

      case "health": {
        // Stub - would pull from wellness API
        return {
          health: 0.85,
          urgency: 0.2,
          momentum: 0.6,
          emotion: "flowing",
          message: "Wellness stable",
        };
      }

      case "finance": {
        // Stub - would pull from finance API
        return {
          health: 0.7,
          urgency: 0.3,
          momentum: 0.5,
          emotion: "neutral",
          message: "Cashflow stable",
        };
      }

      case "relationships": {
        // Stub - would pull from relationships API
        return {
          health: 0.75,
          urgency: 0.4,
          momentum: 0.6,
          emotion: "flowing",
          message: "Connections active",
        };
      }

      default:
        return {
          health: 0.5,
          urgency: 0.3,
          momentum: 0.5,
          emotion: "neutral",
        };
    }
  } catch (error) {
    console.error(`Failed to fetch state for node ${nodeId}:`, error);
    return {
      health: 0.5,
      urgency: 0.3,
      momentum: 0.5,
      emotion: "neutral",
    };
  }
}

export async function getNodeState(nodeId: NodeId, userId: string): Promise<NodeStatus> {
  const status = await fetchNodeState(nodeId, userId);
  
  // Update cache
  cache[nodeId] = {
    status,
    timestamp: Date.now(),
  };

  return status;
}

export function getCachedNodeState(nodeId: NodeId): NodeStatus | null {
  return cache[nodeId]?.status || null;
}

