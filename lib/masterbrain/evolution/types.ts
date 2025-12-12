// Master Brain Evolution Engine v1 - Types
// lib/masterbrain/evolution/types.ts

export type IdeaSource = 'diagnostics' | 'user' | 'dev' | 'ai';

export type IdeaSeverity = 'low' | 'medium' | 'high';

export type ImpactArea = 'ux' | 'performance' | 'retention' | 'accuracy' | 'education' | 'reliability';

export type EffortEstimate = 'low' | 'medium' | 'high';

export type IdeaStatus = 'backlog' | 'planned' | 'in_experiment' | 'done' | 'dropped';

export type ExperimentStatus = 'planned' | 'running' | 'completed' | 'cancelled';

export type ExperimentOutcome = 'improved' | 'no_change' | 'worse' | 'inconclusive';

export interface ImprovementIdea {
  id: string;
  source: IdeaSource;
  title: string;
  description: string | null;
  module_id: string | null;
  capability_id: string | null;
  severity: IdeaSeverity | null;
  impact_area: ImpactArea | null;
  effort_estimate: EffortEstimate | null;
  status: IdeaStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Experiment {
  id: string;
  name: string;
  hypothesis: string;
  description: string | null;
  idea_ids: string[];
  target_metrics: any;
  status: ExperimentStatus;
  created_by: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface ExperimentRun {
  id: string;
  experiment_id: string;
  variant: string;
  parameters: any;
  metrics_before: any;
  metrics_after: any;
  result_summary: string | null;
  outcome: ExperimentOutcome | null;
  created_at: string;
}

export interface ChangelogEntry {
  id: string;
  title: string;
  description: string | null;
  module_id: string | null;
  tags: any;
  experiment_id: string | null;
  created_by: string;
  created_at: string;
}

export interface UserFeedback {
  id: string;
  user_id: string;
  module_id: string | null;
  capability_id: string | null;
  context: any;
  rating: number | null;
  comment: string | null;
  created_at: string;
}


