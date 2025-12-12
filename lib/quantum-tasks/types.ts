// Quantum Task Engine Types
// lib/quantum-tasks/types.ts

export interface QuantumTask {
  id: string;
  userId: string;
  title: string;
  description?: string;
  rawInput: string;

  // Task ontology
  domain: "work" | "relationships" | "finance" | "life" | "strategy";
  taskType: string;
  intent?: string;

  // Requirements
  identityModeNeeded?: string;
  energyRequirement: number; // 0-1
  timeRequirementMinutes?: number;
  cognitiveDifficulty: number; // 0-1

  // Context
  emotionalResistance: number; // 0-1
  relationshipRelevance: string[]; // Person IDs
  strategicImportance: number; // 0-1

  // Dependencies
  dependsOn: string[]; // Task IDs
  blocks: string[]; // Task IDs

  // Micro-steps
  microSteps: MicroStep[];

  // Liquidity
  currentDay?: string; // ISO date
  currentIdentityMode?: string;
  currentEnergySlot?: "morning" | "afternoon" | "evening";
  currentTimeSliceId?: string;

  // Status
  status: "pending" | "in_progress" | "completed" | "deferred" | "cancelled";
  priority: number; // 0-1

  // Metadata
  createdAt: string;
  updatedAt: string;
  completedAt?: string;

  // Cortex integration
  cortexContextSnapshot?: any;
}

export interface MicroStep {
  id: string;
  title: string;
  description?: string;
  estimatedMinutes: number;
  order: number;
  completed: boolean;
}

export interface TaskInterpretation {
  domain: QuantumTask["domain"];
  taskType: string;
  intent?: string;
  identityModeNeeded?: string;
  energyRequirement: number;
  timeRequirementMinutes?: number;
  cognitiveDifficulty: number;
  emotionalResistance: number;
  relationshipRelevance: string[];
  strategicImportance: number;
  microSteps: MicroStep[];
}



