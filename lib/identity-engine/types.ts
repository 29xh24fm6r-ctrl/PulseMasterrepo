// Identity Engine Types (client-safe)
// lib/identity-engine/types.ts

export interface Value {
  id: string;
  user_id: string;
  value_name: string;
  description?: string;
  importance_rank?: number;
  confidence: number;
  source: string;
  active: boolean;
}

export interface Strength {
  id: string;
  user_id: string;
  strength_name: string;
  category?: string;
  description?: string;
  confidence: number;
  evidence_count: number;
}

export interface GrowthArea {
  id: string;
  user_id: string;
  area_name: string;
  current_level?: number;
  target_level?: number;
  priority: string;
  status: string;
}

export interface Role {
  id: string;
  user_id: string;
  role_name: string;
  importance: number;
  satisfaction?: number;
  aspirations?: string;
}

export interface Aspiration {
  id: string;
  user_id: string;
  aspiration_type: string;
  title: string;
  time_horizon?: string;
  progress: number;
  status: string;
}

export interface IdentityProfile {
  values: Value[];
  strengths: Strength[];
  growth_areas: GrowthArea[];
  roles: Role[];
  aspirations: Aspiration[];
  beliefs: any[];
  narrative_summary?: string;
}

