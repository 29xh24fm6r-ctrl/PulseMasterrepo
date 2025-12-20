// World Types (shared between server and client)
// lib/world/types.ts

export interface WorldInfluence {
  stressFronts: Array<{
    name: string;
    severity: "low" | "medium" | "high";
    timeframe: string;
    description: string;
  }>;
  focusHighs: Array<{
    name: string;
    intensity: number;
    timeframe: string;
    description: string;
  }>;
  burnoutRiskSpikes: Array<{
    name: string;
    risk: number;
    timeframe: string;
    description: string;
  }>;
  opportunityWindows: Array<{
    name: string;
    probability: number;
    timeframe: string;
    description: string;
  }>;
  bestEnergyHours: Array<{
    day: string;
    hours: string;
    energy: number;
  }>;
}
