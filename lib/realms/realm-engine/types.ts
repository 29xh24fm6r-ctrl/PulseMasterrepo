// Realm Engine Types - 3D realms with rules and behavior
// lib/realms/realm-engine/types.ts

import { SemanticNode, NodeCluster } from "../node-engine/types";

export type RealmId = "life" | "productivity" | "work" | "growth" | "wellness" | "relationships" | "finance";

export interface CameraConfig {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  minDistance?: number;
  maxDistance?: number;
}

export interface RealmRules {
  nodeSpacing: number;
  clusterRadius: number;
  maxNodes: number;
  allowOverlap: boolean;
  gravity?: number;
  repulsion?: number;
}

export interface RealmAtmosphere {
  fogColor: string;
  fogDensity: number;
  ambientLight: number;
  pointLights: Array<{
    position: [number, number, number];
    color: string;
    intensity: number;
  }>;
}

export interface RealmState {
  id: RealmId;
  nodes: SemanticNode[];
  clusters: NodeCluster[];
  camera: CameraConfig;
  atmosphere: RealmAtmosphere;
  rules: RealmRules;
  activeNodeId?: string;
  hoveredNodeId?: string;
}

export interface RealmConfig {
  id: RealmId;
  label: string;
  description: string;
  camera: CameraConfig;
  atmosphere: RealmAtmosphere;
  rules: RealmRules;
  nodeGenerators: Array<(userId: string) => Promise<SemanticNode[]>>;
}



