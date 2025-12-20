// Zero Friction Types (shared between server and client)
// lib/zero-friction/types.ts

export interface AdaptiveInterfaceConfig {
  showComplexFeatures: boolean;
  voiceFirstMode: boolean;
  showAdvancedDashboards: boolean;
  addNudges: boolean;
  simplifyLayouts: boolean;
  reduceVisualNoise: boolean;
  softenColors: boolean;
  slowAnimations: boolean;
  calmerTone: boolean;
  showMicroExplainers: boolean;
  informationDensity: "low" | "medium" | "high";
  componentVisibility: Record<string, boolean>;
}

export interface GuardianState {
  isActive: boolean;
  activatedAt?: string;
  activationReason?: string;
  simplifiedInterfaceEnabled: boolean;
  notificationsPaused: boolean;
  coachToneOverride?: string;
}

