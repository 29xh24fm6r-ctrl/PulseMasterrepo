// Universe Node Configuration
// lib/universe/config.ts

export type UniverseNodeId =
  | 'life'
  | 'productivity'
  | 'work'
  | 'growth'
  | 'wellness'
  | 'relationships'
  | 'finance'
  | 'simulation'
  | 'squads'
  | 'twin'
  | 'autopilot';

export interface UniverseNodeConfig {
  id: UniverseNodeId;
  label: string;
  description: string;
  route: string;
  orbitRadius: number; // distance from center
  size: number; // sphere size
  hue: number; // base color hue (0-360)
  importance: number; // weight for glow/pulse (0-1)
  orbitAngle: number; // starting angle in degrees
  orbitSpeed: number; // rotation speed multiplier
}

export const UNIVERSE_NODES: UniverseNodeConfig[] = [
  {
    id: 'life',
    label: 'Life Core',
    description: 'Your overall state, arcs & XP.',
    route: '/life',
    orbitRadius: 4,
    size: 1.3,
    hue: 285, // purple
    importance: 1.0,
    orbitAngle: 0,
    orbitSpeed: 0.3,
  },
  {
    id: 'productivity',
    label: 'Execution Engine',
    description: 'Tasks, focus, time.',
    route: '/productivity',
    orbitRadius: 6,
    size: 1.1,
    hue: 260, // blue-purple
    importance: 0.9,
    orbitAngle: 60,
    orbitSpeed: 0.4,
  },
  {
    id: 'work',
    label: 'Work Hub',
    description: 'Deals, KPIs, performance.',
    route: '/work',
    orbitRadius: 5.5,
    size: 1.0,
    hue: 210, // blue
    importance: 0.85,
    orbitAngle: 120,
    orbitSpeed: 0.35,
  },
  {
    id: 'growth',
    label: 'Ascension Chamber',
    description: 'Levels, missions, transformation.',
    route: '/growth',
    orbitRadius: 7,
    size: 1.2,
    hue: 30, // orange
    importance: 0.8,
    orbitAngle: 180,
    orbitSpeed: 0.25,
  },
  {
    id: 'wellness',
    label: 'Vitality Lab',
    description: 'Health, energy, stress.',
    route: '/wellness',
    orbitRadius: 5,
    size: 0.9,
    hue: 150, // green
    importance: 0.75,
    orbitAngle: 240,
    orbitSpeed: 0.4,
  },
  {
    id: 'relationships',
    label: 'Connection Realm',
    description: 'People, relationships, network.',
    route: '/relationships',
    orbitRadius: 6.5,
    size: 1.0,
    hue: 330, // pink
    importance: 0.7,
    orbitAngle: 300,
    orbitSpeed: 0.3,
  },
  {
    id: 'finance',
    label: 'Finance System',
    description: 'Money, budgets, goals.',
    route: '/finance',
    orbitRadius: 4.5,
    size: 0.8,
    hue: 120, // green-blue
    importance: 0.65,
    orbitAngle: 30,
    orbitSpeed: 0.35,
  },
  {
    id: 'simulation',
    label: 'Life Simulator',
    description: 'Explore potential futures.',
    route: '/simulator',
    orbitRadius: 8,
    size: 1.1,
    hue: 270, // magenta
    importance: 0.6,
    orbitAngle: 90,
    orbitSpeed: 0.2,
  },
  {
    id: 'twin',
    label: 'AI Twin',
    description: 'Your digital self-model.',
    route: '/twin',
    orbitRadius: 7.5,
    size: 0.9,
    hue: 200, // cyan
    importance: 0.55,
    orbitAngle: 150,
    orbitSpeed: 0.25,
  },
  {
    id: 'autopilot',
    label: 'Autopilot',
    description: 'Automated life management.',
    route: '/autopilot',
    orbitRadius: 9,
    size: 0.7,
    hue: 60, // yellow
    importance: 0.5,
    orbitAngle: 270,
    orbitSpeed: 0.15,
  },
];

export function getNodeById(id: UniverseNodeId): UniverseNodeConfig | undefined {
  return UNIVERSE_NODES.find((node) => node.id === id);
}

export function getMostImportantNode(): UniverseNodeConfig {
  return UNIVERSE_NODES.reduce((prev, current) =>
    current.importance > prev.importance ? current : prev
  );
}



