// Universe State - Real-time metrics for each node
// lib/universe/state.ts

import { UniverseNodeId, UNIVERSE_NODES } from "./config";

export type UniverseNodeMetrics = {
  importance: number; // 0–1
  urgency: number; // 0–1
  momentum: number; // 0–1
};

export type UniverseState = Record<UniverseNodeId, UniverseNodeMetrics>;

export async function getUniverseState(userId: string): Promise<UniverseState> {
  // For v1, implement rough heuristics based on real data
  const state: Partial<UniverseState> = {};

  try {
    // Fetch data in parallel
    const [tasksRes, dealsRes, xpRes, emotionRes, contactsRes] = await Promise.all([
      fetch(`/api/tasks/pull`).catch(() => null),
      fetch(`/api/deals/pull`).catch(() => null),
      fetch(`/api/xp/summary`).catch(() => null),
      fetch(`/api/emotion`).catch(() => null),
      fetch(`/api/contacts/pull`).catch(() => null),
    ]);

    const tasks = tasksRes?.ok ? await tasksRes.json().catch(() => []) : [];
    const deals = dealsRes?.ok ? await dealsRes.json().catch(() => []) : [];
    const xpData = xpRes?.ok ? await xpRes.json().catch(() => null) : null;
    const emotionData = emotionRes?.ok ? await emotionRes.json().catch(() => null) : null;
    const contacts = contactsRes?.ok ? await contactsRes.json().catch(() => []) : [];

    // Life: based on weekly XP + number of active arcs
    const xpTotal = xpData?.total || 0;
    const activeArcs = 3; // TODO: fetch from arcs API
    state.life = {
      importance: Math.min(1, (xpTotal / 10000) * 0.5 + (activeArcs / 5) * 0.5),
      urgency: 0.3, // Life is rarely urgent
      momentum: Math.min(1, (xpTotal / 5000) * 0.7 + 0.3),
    };

    // Productivity: number of tasks due today/overdue
    const today = new Date().toISOString().split("T")[0];
    const overdueTasks = tasks.filter(
      (t: any) => t.due_date && t.due_date < today && t.status !== "completed"
    ).length;
    const todayTasks = tasks.filter(
      (t: any) => t.due_date === today && t.status !== "completed"
    ).length;
    const totalTasks = tasks.filter((t: any) => t.status !== "completed").length;
    state.productivity = {
      importance: Math.min(1, totalTasks / 20),
      urgency: Math.min(1, (overdueTasks * 0.7 + todayTasks * 0.3) / 10),
      momentum: Math.min(1, (totalTasks - overdueTasks - todayTasks) / 15),
    };

    // Work: number of active deals + meetings
    const activeDeals = deals.filter((d: any) => d.status === "active").length;
    state.work = {
      importance: Math.min(1, activeDeals / 10),
      urgency: Math.min(1, activeDeals / 5),
      momentum: Math.min(1, activeDeals / 8),
    };

    // Growth: active missions + level progress
    state.growth = {
      importance: 0.7,
      urgency: 0.2,
      momentum: Math.min(1, (xpTotal / 20000) * 0.8 + 0.2),
    };

    // Wellness: recent emotion volatility + wellness score
    const emotionVolatility = emotionData?.volatility || 0.3;
    state.wellness = {
      importance: 0.6,
      urgency: emotionVolatility > 0.7 ? 0.8 : 0.3,
      momentum: 1 - emotionVolatility,
    };

    // Relationships: # of stale high-priority contacts
    const staleContacts = contacts.filter((c: any) => {
      if (!c.last_contact) return true;
      const daysSince = (Date.now() - new Date(c.last_contact).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > 30 && (c.importance === "high" || c.relationship === "close");
    }).length;
    state.relationships = {
      importance: Math.min(1, contacts.length / 50),
      urgency: Math.min(1, staleContacts / 5),
      momentum: Math.min(1, (contacts.length - staleContacts) / contacts.length || 0.5),
    };

    // Finance: upcoming payments / budget variances (stub)
    state.finance = {
      importance: 0.5,
      urgency: 0.2,
      momentum: 0.6,
    };

    // Simulation: presence/absence of saved sims
    state.simulation = {
      importance: 0.3,
      urgency: 0.1,
      momentum: 0.4,
    };

    // Squads: # of active squad missions (stub)
    state.squads = {
      importance: 0.4,
      urgency: 0.2,
      momentum: 0.5,
    };

    // Twin: last updated timestamp recency (stub)
    state.twin = {
      importance: 0.6,
      urgency: 0.1,
      momentum: 0.7,
    };

    // Autopilot: # of pending suggested actions (stub)
    state.autopilot = {
      importance: 0.8,
      urgency: 0.3,
      momentum: 0.6,
    };
  } catch (error) {
    console.error("Failed to fetch universe state:", error);
    // Return default state on error
    UNIVERSE_NODES.forEach((node) => {
      state[node.id] = {
        importance: node.importance,
        urgency: 0.3,
        momentum: 0.5,
      };
    });
  }

  // Ensure all nodes have metrics
  UNIVERSE_NODES.forEach((node) => {
    if (!state[node.id]) {
      state[node.id] = {
        importance: node.importance,
        urgency: 0.3,
        momentum: 0.5,
      };
    }
  });

  return state as UniverseState;
}



