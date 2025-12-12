// Realm Builder - Constructs realm states from configs
// lib/realms/realm-engine/realm-builder.ts

import { RealmConfig, RealmState, RealmId } from "./types";
import { SemanticNode, NodeCluster } from "../node-engine/types";
import { buildNodeFromFocus, buildNodeFromEmotion, buildNodeFromXP } from "../node-engine/node-builder";

export async function buildRealmState(
  realmId: RealmId,
  userId: string,
  customConfig?: Partial<RealmConfig>
): Promise<RealmState> {
  const config = getRealmConfig(realmId);
  const mergedConfig = { ...config, ...customConfig };

  // Generate nodes using configured generators
  const nodeArrays = await Promise.all(
    mergedConfig.nodeGenerators.map((generator) => generator(userId))
  );
  const nodes = nodeArrays.flat();

  // Build clusters from nodes
  const clusters = buildClusters(nodes, mergedConfig.rules);

  return {
    id: realmId,
    nodes,
    clusters,
    camera: mergedConfig.camera,
    atmosphere: mergedConfig.atmosphere,
    rules: mergedConfig.rules,
  };
}

function buildClusters(nodes: SemanticNode[], rules: RealmConfig["rules"]): NodeCluster[] {
  // Simple clustering: group nodes by type
  const clustersByType = new Map<string, SemanticNode[]>();
  
  nodes.forEach((node) => {
    const type = node.type;
    if (!clustersByType.has(type)) {
      clustersByType.set(type, []);
    }
    clustersByType.get(type)!.push(node);
  });

  const clusters: NodeCluster[] = [];
  let angle = 0;
  const angleStep = (Math.PI * 2) / clustersByType.size;

  clustersByType.forEach((clusterNodes, type) => {
    const centerX = Math.cos(angle) * rules.clusterRadius;
    const centerZ = Math.sin(angle) * rules.clusterRadius;
    
    clusters.push({
      id: `cluster-${type}`,
      nodes: clusterNodes,
      center: { x: centerX, y: 0, z: centerZ },
      radius: rules.clusterRadius,
    });

    angle += angleStep;
  });

  return clusters;
}

function getRealmConfig(realmId: RealmId): RealmConfig {
  const configs: Record<RealmId, RealmConfig> = {
    life: {
      id: "life",
      label: "Life Core",
      description: "Your life at a glance",
      camera: {
        position: [0, 0.8, 4.5],
        target: [0, 0, 0],
        fov: 45,
        autoRotate: true,
        autoRotateSpeed: 0.5,
        minDistance: 3,
        maxDistance: 10,
      },
      atmosphere: {
        fogColor: "#050014",
        fogDensity: 0.3,
        ambientLight: 0.7,
        pointLights: [
          { position: [0, 3, 4], color: "#8b5cf6", intensity: 1.4 },
          { position: [-4, -2, 2], color: "#ec4899", intensity: 0.6 },
          { position: [4, -2, 2], color: "#06b6d4", intensity: 0.6 },
        ],
      },
      rules: {
        nodeSpacing: 1.5,
        clusterRadius: 3,
        maxNodes: 50,
        allowOverlap: false,
        gravity: 0.1,
        repulsion: 0.5,
      },
      nodeGenerators: [
        async (userId) => {
          // Generate focus nodes
          try {
            const res = await fetch("/api/tasks/pull");
            const tasks = res.ok ? await res.json() : [];
            return tasks.slice(0, 5).map((task: any) => buildNodeFromFocus(task));
          } catch {
            return [];
          }
        },
        async (userId) => {
          // Generate emotion node
          try {
            const res = await fetch("/api/emotion");
            const data = res.ok ? await res.json() : null;
            if (data?.current) {
              return [buildNodeFromEmotion(data.current)];
            }
            return [];
          } catch {
            return [];
          }
        },
        async (userId) => {
          // Generate XP node
          try {
            const res = await fetch("/api/xp/summary");
            const data = res.ok ? await res.json() : null;
            if (data) {
              return [buildNodeFromXP(data)];
            }
            return [];
          } catch {
            return [];
          }
        },
      ],
    },
    productivity: {
      id: "productivity",
      label: "Execution Engine",
      description: "Tasks, focus, time",
      camera: {
        position: [0, 1, 5],
        target: [0, 0, 0],
        fov: 50,
        autoRotate: false,
        minDistance: 4,
        maxDistance: 12,
      },
      atmosphere: {
        fogColor: "#1e1b4b",
        fogDensity: 0.2,
        ambientLight: 0.6,
        pointLights: [
          { position: [0, 2, 3], color: "#6366f1", intensity: 1.2 },
        ],
      },
      rules: {
        nodeSpacing: 1.2,
        clusterRadius: 2.5,
        maxNodes: 30,
        allowOverlap: false,
        gravity: 0.15,
        repulsion: 0.6,
      },
      nodeGenerators: [],
    },
    work: {
      id: "work",
      label: "Work Hub",
      description: "Deals, KPIs, performance",
      camera: {
        position: [0, 0.5, 4],
        target: [0, 0, 0],
        fov: 45,
        autoRotate: false,
        minDistance: 3,
        maxDistance: 8,
      },
      atmosphere: {
        fogColor: "#1e3a5f",
        fogDensity: 0.25,
        ambientLight: 0.65,
        pointLights: [
          { position: [0, 2, 3], color: "#3b82f6", intensity: 1.3 },
        ],
      },
      rules: {
        nodeSpacing: 1.3,
        clusterRadius: 2.8,
        maxNodes: 40,
        allowOverlap: false,
        gravity: 0.12,
        repulsion: 0.55,
      },
      nodeGenerators: [],
    },
    growth: {
      id: "growth",
      label: "Ascension Chamber",
      description: "Levels, missions, transformation",
      camera: {
        position: [0, 1.2, 5],
        target: [0, 0, 0],
        fov: 50,
        autoRotate: true,
        autoRotateSpeed: 0.3,
        minDistance: 4,
        maxDistance: 10,
      },
      atmosphere: {
        fogColor: "#4a2c2a",
        fogDensity: 0.3,
        ambientLight: 0.7,
        pointLights: [
          { position: [0, 3, 4], color: "#f97316", intensity: 1.5 },
          { position: [0, -2, 2], color: "#fbbf24", intensity: 0.8 },
        ],
      },
      rules: {
        nodeSpacing: 1.4,
        clusterRadius: 3.2,
        maxNodes: 35,
        allowOverlap: false,
        gravity: 0.1,
        repulsion: 0.5,
      },
      nodeGenerators: [],
    },
    wellness: {
      id: "wellness",
      label: "Vitality Lab",
      description: "Health, energy, stress",
      camera: {
        position: [0, 0.6, 4],
        target: [0, 0, 0],
        fov: 45,
        autoRotate: false,
        minDistance: 3,
        maxDistance: 9,
      },
      atmosphere: {
        fogColor: "#064e3b",
        fogDensity: 0.2,
        ambientLight: 0.65,
        pointLights: [
          { position: [0, 2, 3], color: "#10b981", intensity: 1.2 },
        ],
      },
      rules: {
        nodeSpacing: 1.3,
        clusterRadius: 2.6,
        maxNodes: 25,
        allowOverlap: false,
        gravity: 0.1,
        repulsion: 0.5,
      },
      nodeGenerators: [],
    },
    relationships: {
      id: "relationships",
      label: "Connection Realm",
      description: "People, relationships, network",
      camera: {
        position: [0, 0.8, 5],
        target: [0, 0, 0],
        fov: 50,
        autoRotate: true,
        autoRotateSpeed: 0.4,
        minDistance: 4,
        maxDistance: 11,
      },
      atmosphere: {
        fogColor: "#4a1e3a",
        fogDensity: 0.3,
        ambientLight: 0.7,
        pointLights: [
          { position: [0, 3, 4], color: "#ec4899", intensity: 1.4 },
        ],
      },
      rules: {
        nodeSpacing: 1.5,
        clusterRadius: 3.5,
        maxNodes: 45,
        allowOverlap: false,
        gravity: 0.08,
        repulsion: 0.45,
      },
      nodeGenerators: [],
    },
    finance: {
      id: "finance",
      label: "Finance System",
      description: "Money, budgets, goals",
      camera: {
        position: [0, 0.5, 4],
        target: [0, 0, 0],
        fov: 45,
        autoRotate: false,
        minDistance: 3,
        maxDistance: 8,
      },
      atmosphere: {
        fogColor: "#164e63",
        fogDensity: 0.25,
        ambientLight: 0.6,
        pointLights: [
          { position: [0, 2, 3], color: "#06b6d4", intensity: 1.2 },
        ],
      },
      rules: {
        nodeSpacing: 1.2,
        clusterRadius: 2.4,
        maxNodes: 30,
        allowOverlap: false,
        gravity: 0.12,
        repulsion: 0.55,
      },
      nodeGenerators: [],
    },
  };

  return configs[realmId];
}



