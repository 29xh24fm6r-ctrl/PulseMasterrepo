// Global Design System v3 - Scene Definitions
// design-system/scenes.ts
// Each dashboard is a "scene" with its own visual identity

export interface SceneConfig {
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  gradient: string;
  icon: string;
  heroCTA: string;
}

export const scenes: Record<string, SceneConfig> = {
  life: {
    name: "Command Center",
    description: "Your life's central command",
    primaryColor: "rgb(139, 92, 246)",
    secondaryColor: "rgb(236, 72, 153)",
    gradient: "linear-gradient(135deg, rgb(139, 92, 246) 0%, rgb(236, 72, 153) 100%)",
    icon: "🎯",
    heroCTA: "View Today's Focus",
  },
  productivity: {
    name: "Execution Engine",
    description: "Where focus meets action",
    primaryColor: "rgb(6, 182, 212)",
    secondaryColor: "rgb(59, 130, 246)",
    gradient: "linear-gradient(135deg, rgb(6, 182, 212) 0%, rgb(59, 130, 246) 100%)",
    icon: "⚡",
    heroCTA: "Start Focus Session",
  },
  work: {
    name: "Performance Hub",
    description: "Your professional command center",
    primaryColor: "rgb(59, 130, 246)",
    secondaryColor: "rgb(34, 211, 238)",
    gradient: "linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(34, 211, 238) 100%)",
    icon: "💼",
    heroCTA: "Review Today's Wins",
  },
  wellness: {
    name: "Vitality Console",
    description: "Your health and energy dashboard",
    primaryColor: "rgb(34, 197, 94)",
    secondaryColor: "rgb(74, 222, 128)",
    gradient: "linear-gradient(135deg, rgb(34, 197, 94) 0%, rgb(74, 222, 128) 100%)",
    icon: "🌱",
    heroCTA: "Check Your Vitality Score",
  },
  growth: {
    name: "Ascension Chamber",
    description: "Level up your life",
    primaryColor: "rgb(139, 92, 246)",
    secondaryColor: "rgb(251, 146, 60)",
    gradient: "linear-gradient(135deg, rgb(139, 92, 246) 0%, rgb(251, 146, 60) 100%)",
    icon: "🚀",
    heroCTA: "View Your Next Level",
  },
  dojo: {
    name: "Training Grounds",
    description: "Master your skills",
    primaryColor: "rgb(236, 72, 153)",
    secondaryColor: "rgb(139, 92, 246)",
    gradient: "linear-gradient(135deg, rgb(236, 72, 153) 0%, rgb(139, 92, 246) 100%)",
    icon: "🥋",
    heroCTA: "Start Daily Drill",
  },
  relationships: {
    name: "Connection Garden",
    description: "Nurture your relationships",
    primaryColor: "rgb(236, 72, 153)",
    secondaryColor: "rgb(251, 146, 60)",
    gradient: "linear-gradient(135deg, rgb(236, 72, 153) 0%, rgb(251, 146, 60) 100%)",
    icon: "💝",
    heroCTA: "See Who Needs You",
  },
} as const;

export type SceneKey = keyof typeof scenes;

export function getSceneConfig(key: string): SceneConfig {
  return scenes[key as SceneKey] || scenes.life;
}



