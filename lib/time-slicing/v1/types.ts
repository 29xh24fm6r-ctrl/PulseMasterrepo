// Time Slicing Engine v1 Types
// lib/time-slicing/v1/types.ts

export interface TimeSliceBlock {
  id: string;
  domain: "work" | "relationships" | "finance" | "life" | "strategy";
  start: string; // ISO timestamp
  end: string; // ISO timestamp
  duration: number; // minutes
  intensity: number; // 0-1
  identityMode?: string; // Archetype mode for this block
  energyRequired: "low" | "medium" | "high";
  description?: string;
  tasks?: string[]; // Task IDs or titles
}

export interface TimeSliceAllocation {
  domain: string;
  weeklyMinutes: number;
  dailyAverage: number;
  distribution: Array<{
    day: number; // 0-6
    minutes: number;
  }>;
}

export interface TimeSliceOptimization {
  allocations: TimeSliceAllocation[];
  focusBlocks: TimeSliceBlock[];
  flowStateWindows: TimeSliceBlock[];
  recoveryPeriods: TimeSliceBlock[];
  weeklyDistribution: Record<string, number>; // domain -> minutes
}



