// Boardroom Brain v1 - Types
// lib/boardroom/types.ts

export interface StrategicDomain {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface StrategicObjective {
  id: string;
  user_id: string;
  domain_id: string;
  name: string;
  description: string | null;
  timeframe_start: string | null;
  timeframe_end: string | null;
  priority: number;
  status: 'active' | 'paused' | 'achieved' | 'abandoned';
  success_metrics: any;
  created_at: string;
}

export interface StrategicPlaybook {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  domain_hint: string | null;
  prerequisites: any;
  key_moves: any;
  risks: any;
  metrics: any;
  created_at: string;
}

export interface StrategicPlan {
  id: string;
  user_id: string;
  objective_id: string;
  primary_playbook_id: string | null;
  name: string;
  summary: string | null;
  assumptions: any;
  risk_register: any;
  status: 'draft' | 'active' | 'under_review' | 'retired';
  created_at: string;
}

export interface Decision {
  id: string;
  user_id: string;
  domain_id: string | null;
  objective_id: string | null;
  title: string;
  description: string | null;
  context: any;
  importance: number;
  status: 'open' | 'decided' | 'shelved';
  chosen_option: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface DecisionOption {
  id: string;
  decision_id: string;
  label: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
}

export interface ExecutiveCouncilMember {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  role: string | null;
  archetype_tags: any;
  voice_profile_id: string | null;
  is_system_default: boolean;
  is_active: boolean;
  created_at: string;
}

export interface ExecutiveCouncilVote {
  id: string;
  decision_id: string;
  member_id: string;
  option_id: string;
  rationale: string | null;
  concerns: any;
  confidence: number;
  created_at: string;
}

export interface DecisionScenario {
  id: string;
  decision_id: string;
  option_id: string;
  name: string;
  parameters: any;
  simulated_outcomes: any;
  narrative_summary: string | null;
  risk_score: number | null;
  created_at: string;
}

export interface ScenarioParameters {
  time_focus?: number;
  stress?: number;
  energy_use?: number;
  revenue_range?: [number, number];
  rate_path?: string;
  dscr_variation?: number;
}

export interface ScenarioOutcomeSummary {
  cash_flow: number;
  freedom_score: number;
  optionality: number;
  relationship_strain: number;
  key_metrics: Record<string, number>;
}


