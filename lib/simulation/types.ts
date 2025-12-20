// Simulation Types (client-safe)
// lib/simulation/types.ts

export interface Simulation {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  simulation_type: string;
  status: "draft" | "running" | "completed" | "archived";
  base_scenario: Record<string, any>;
  variables: any[];
  time_horizon?: string;
  outcomes?: any[];
  recommended_path?: string;
  confidence?: number;
}

export interface WhatIf {
  id: string;
  user_id: string;
  question: string;
  category?: string;
  key_factors: string[];
  potential_outcomes: any[];
  risks: string[];
  benefits: string[];
  recommendation?: string;
}
