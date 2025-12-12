// Destiny Engine v2 + Timeline Coach v1 - Types
// lib/destiny/types.ts

export type TimelineArchetype = 'builder' | 'explorer' | 'guardian' | 'warrior' | 'sage' | 'creator' | 'pioneer';

export type TimelineCoachMode = 'compare_paths' | 'refine_path' | 'next_steps' | 'crisis_repath';

export type MilestoneStatus = 'pending' | 'in_progress' | 'achieved' | 'abandoned';

export type AnchorStrength = 'soft' | 'firm';

export interface DestinyTimeline {
  id: string;
  user_id: string;
  key: string | null;
  name: string;
  description: string | null;
  time_horizon_years: number | null;
  archetype: string | null;
  mythic_frame: string | null;
  primary_domains: string[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface DestinyWaypoint {
  id: string;
  timeline_id: string;
  ordering: number;
  name: string;
  description: string | null;
  target_date: string | null;
  related_node_id: string | null;
  strategic_objective_id: string | null;
  created_at: string;
}

export interface DestinyMilestone {
  id: string;
  waypoint_id: string;
  name: string;
  description: string | null;
  target_date: string | null;
  status: MilestoneStatus;
  created_at: string;
  updated_at: string;
}

export interface DestinyTimelineScore {
  id: string;
  timeline_id: string;
  snapshot_at: string;
  feasibility_score: number | null;
  alignment_score: number | null;
  risk_score: number | null;
  emotional_fit_score: number | null;
  simulation_summary: any | null;
  narrative_summary: string | null;
  created_at: string;
}

export interface DestinySimulationRun {
  id: string;
  timeline_id: string;
  run_at: string;
  parameters: any | null;
  results: any | null;
  created_at: string;
}

export interface TimelineCoachSession {
  id: string;
  user_id: string;
  mode: TimelineCoachMode;
  created_at: string;
  completed_at: string | null;
  selected_timeline_ids: string[];
  question: string | null;
  response: string | null;
  summary: string | null;
  recommendations: any | null;
  followup_actions: any | null;
}

export interface DestinyAnchorChoice {
  id: string;
  user_id: string;
  timeline_id: string;
  chosen_at: string;
  strength: AnchorStrength;
  notes: string | null;
  created_at: string;
}
