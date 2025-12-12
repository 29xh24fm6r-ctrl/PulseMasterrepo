// Pulse City Generator - Life as a Living World
// lib/city/city-generator.ts

import { PulseCortexContext } from "@/lib/cortex/types";

export interface CityBuilding {
  id: string;
  type: "relationship" | "task" | "project" | "habit";
  name: string;
  x: number;
  z: number;
  height: number; // 0-100, represents strength/progress
  color: string;
  glow: boolean;
  windows: Array<{
    lit: boolean;
    color: string;
  }>;
}

export interface CityState {
  buildings: CityBuilding[];
  roads: Array<{
    id: string;
    from: string;
    to: string;
    width: number;
  }>;
  centralTower: {
    height: number;
    glow: number; // 0-1, identity arc progress
  };
  skyline: {
    horizon: number; // Mission arc progress
    aurora: boolean; // Breakthrough detected
  };
  weather: {
    smog: number; // 0-1, burnout level
    clouds: Array<{
      x: number;
      z: number;
      size: number;
      opacity: number;
    }>;
  };
  rivers: Array<{
    id: string;
    x: number;
    z: number;
    width: number;
    glow: number; // XP level
  }>;
  trees: Array<{
    id: string;
    x: number;
    z: number;
    bloom: number; // 0-1, opportunity level
  }>;
}

/**
 * Generate city from Cortex state
 */
export function generateCity(ctx: PulseCortexContext): CityState {
  const buildings: CityBuilding[] = [];

  // Relationships as buildings
  const relationships = ctx.domains.relationships?.keyPeople || [];
  relationships.forEach((person, i) => {
    const angle = (i / relationships.length) * Math.PI * 2;
    const radius = 20 + (person.relationshipScore / 100) * 30;
    buildings.push({
      id: `rel_${person.id}`,
      type: "relationship",
      name: person.name,
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      height: person.relationshipScore,
      color: person.daysSinceInteraction > 30 ? "rgb(113, 113, 122)" : "rgb(59, 130, 246)",
      glow: person.relationshipScore > 70,
      windows: Array.from({ length: Math.floor(person.relationshipScore / 10) }).map(() => ({
        lit: person.daysSinceInteraction < 7,
        color: person.daysSinceInteraction < 7 ? "rgb(251, 191, 36)" : "rgb(39, 39, 42)",
      })),
    });
  });

  // Tasks as smaller buildings
  const tasks = ctx.domains.work?.queue || [];
  tasks.slice(0, 10).forEach((task, i) => {
    const angle = (i / 10) * Math.PI * 2 + Math.PI / 4;
    const radius = 15;
    buildings.push({
      id: `task_${task.id}`,
      type: "task",
      name: task.title,
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      height: (task.priority === "high" ? 30 : task.priority === "medium" ? 20 : 10),
      color: task.priority === "urgent" ? "rgb(239, 68, 68)" : "rgb(59, 130, 246)",
      glow: task.priority === "high" || task.priority === "urgent",
      windows: [],
    });
  });

  // Central tower (identity)
  const identityProfile = ctx.longitudinal.chapters[ctx.longitudinal.chapters.length - 1];
  const centralTowerHeight = identityProfile ? 80 : 50;
  const identityGlow = 0.7; // Would come from identity arc progress

  // Skyline (mission arc)
  const missionProgress = 0.6; // Would come from mission engine
  const hasBreakthrough = ctx.longitudinal.aggregatedPatterns.some(
    (p) => p.type === "productivity_arc" && p.strength > 0.8
  );

  // Weather (burnout)
  const burnoutLevel = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "burnout_cycle"
  ).length;
  const smog = Math.min(1, burnoutLevel * 0.3);

  // Rivers (XP)
  const xpTotal = ctx.xp.totalXP || 0;
  const rivers = [
    {
      id: "xp_river_1",
      x: -30,
      z: 0,
      width: 3 + (xpTotal / 1000) * 2,
      glow: Math.min(1, xpTotal / 5000),
    },
  ];

  // Trees (opportunities)
  const opportunities = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "productivity_arc"
  );
  const trees = opportunities.map((opp, i) => ({
    id: `tree_${i}`,
    x: 25 + i * 5,
    z: 25 + i * 5,
    bloom: opp.strength || 0.5,
  }));

  return {
    buildings,
    roads: [], // Would generate based on task dependencies
    centralTower: {
      height: centralTowerHeight,
      glow: identityGlow,
    },
    skyline: {
      horizon: missionProgress,
      aurora: hasBreakthrough,
    },
    weather: {
      smog,
      clouds: burnoutLevel > 0
        ? Array.from({ length: burnoutLevel }).map((_, i) => ({
            x: Math.random() * 100 - 50,
            z: Math.random() * 100 - 50,
            size: 10 + Math.random() * 10,
            opacity: smog,
          }))
        : [],
    },
    rivers,
    trees,
  };
}



