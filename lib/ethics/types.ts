// Ethical Compass & Value Alignment Types
// lib/ethics/types.ts

export interface ValueProfile {
  userId: string;
  summary?: string;
  coreValues: Array<{
    key: string;
    name: string;
    description?: string;
    strength: number; // 0-1
  }>;
  rolePriorities: Record<string, number>;
  redLines: Array<{
    key: string;
    description: string;
    severity: number; // 0-1
  }>;
  aspirationStatement?: string;
}

export interface EthicalPolicy {
  userId?: string | null;
  scope: 'system' | 'user' | 'domain';
  domain?: string | null;
  key: string;
  name: string;
  description?: string;
  priority: number;
  isActive: boolean;
  rule: any;
}

export type AlignmentDecision =
  | 'allow'
  | 'allow_with_changes'
  | 'block'
  | 'escalate_to_user';

export interface AlignmentEvaluationInput {
  userId: string;
  source: string;         // 'autopilot', 'coach', etc.
  contextType: string;    // 'action', 'plan', 'message'
  contextId?: string;
  description: string;    // plain text summary of what will be done/said
  actionPayload?: any;    // structured action details
}

export interface AlignmentEvaluationResult {
  ethicalRisk: number;        // 0-1
  valueAlignment: number;     // 0-1
  redFlags: Array<{ key: string; severity: number; explanation: string }>;
  approvals: Array<{ key: string; explanation: string }>;
  recommendedAdjustment?: string;
  finalRecommendation: AlignmentDecision;
}


