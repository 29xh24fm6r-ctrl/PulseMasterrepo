// Somatic Device Integration v2 Types
// lib/somatic/v2/types.ts

export interface SomaticDeviceSettings {
  phoneIntegrationEnabled: boolean;
  appUsageEnabled: boolean;
  notificationsEnabled: boolean;
  locationEnabled: boolean;
  wearableIntegrationEnabled: boolean;
  sleepDataEnabled: boolean;
  heartDataEnabled: boolean;
  stepsDataEnabled: boolean;
}

export interface RawDeviceEvent {
  userId: string;
  occurredAt: Date;
  source: 'phone' | 'wearable' | 'system';
  kind: string;
  metadata?: Record<string, any>;
}

export interface SomaticDailyMetrics {
  userId: string;
  metricsDate: string; // 'YYYY-MM-DD'
  totalScreenMinutes?: number | null;
  nightScreenMinutes?: number | null;
  unlockCount?: number | null;
  notificationCount?: number | null;
  deepWorkDisruptions?: number | null;
  focusAppMinutes?: number | null;
  socialAppMinutes?: number | null;
  entertainmentMinutes?: number | null;
  messagingMinutes?: number | null;
  navigationMinutes?: number | null;
  sleepDurationMinutes?: number | null;
  sleepEfficiency?: number | null;
  sleepQualityScore?: number | null;
  bedtimeLocal?: string | null;
  wakeTimeLocal?: string | null;
  restingHeartRate?: number | null;
  hrVariability?: number | null;
  stepCount?: number | null;
  activityMinutes?: number | null;
  sedentaryMinutes?: number | null;
  recoveryScore?: number | null;
  stimulationScore?: number | null;
  fatigueScore?: number | null;
  stressLoadScore?: number | null;
  circadianAlignment?: number | null;
}

export interface SomaticPatternModel {
  userId: string;
  chronotype?: string;
  bestFocusWindows?: Array<{ start: string; end: string }>;
  lowEnergyWindows?: Array<{ start: string; end: string }>;
  socialEnergyWindows?: Array<{ start: string; end: string }>;
  crashPatterns?: any;
  stimulationSensitivity?: any;
  exerciseEffects?: any;
  summary?: string;
}


