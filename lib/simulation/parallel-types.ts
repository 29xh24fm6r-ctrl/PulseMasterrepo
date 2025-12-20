// Parallel Simulation Types (shared between server and client)
// lib/simulation/parallel-types.ts

export interface SimulationScenario {
  userId: string;
  scenario: string;
  hypothesis?: string;
}

export interface ParallelSimulationResult {
  baseline: {
    narrative: string;
    risks: string[];
    opportunities: string[];
    timeline: Array<{
      month: number;
      events: string[];
      metrics: Record<string, number>;
    }>;
    predictedDeltas: {
      income?: number;
      xp?: number;
      focus?: number;
      burnoutProbability?: number;
    };
  };
  hypothetical?: {
    narrative: string;
    risks: string[];
    opportunities: string[];
    timeline: Array<{
      month: number;
      events: string[];
      metrics: Record<string, number>;
    }>;
    predictedDeltas: {
      income?: number;
      xp?: number;
      focus?: number;
      burnoutProbability?: number;
    };
  };
  comparison?: {
    narrative: string;
    keyDifferences: string[];
    recommendation: string;
  };
}
