// Conscious Workspace v1 + Daily Multi-Timeline Execution Layer - Types
// lib/workspace/types.ts

export type FocusMode = 'normal' | 'deep_work' | 'recovery' | 'sales_push' | 'family' | 'custom';

export type DailyViewMode = 'day_projection' | 'retro' | 'future';

export interface WorkspaceFocusState {
  id: string;
  user_id: string;
  active_timeline_id: string | null;
  active_branch_run_id: string | null;
  focus_mode: FocusMode;
  focus_tags: string[];
  applied_at: string;
  expires_at: string | null;
  created_at: string;
}

export interface DailyTimelineView {
  id: string;
  user_id: string;
  date: string;
  timeline_id: string | null;
  branch_run_id: string | null;
  mode: DailyViewMode;
  summary: string | null;
  key_metrics: any | null;
  suggested_actions: any | null;
  created_at: string;
}

export interface WorkspaceDayLog {
  id: string;
  user_id: string;
  date: string;
  chosen_focus_state_id: string | null;
  executed_timeline_id: string | null;
  summary: string | null;
  key_signals: any | null;
  alignment_delta: number | null;
  created_at: string;
}

export interface SuggestedAction {
  id: string;
  label: string;
  type: 'task' | 'focus_block' | 'deal_move' | 'relationship' | 'health' | 'admin';
  domain?: string;
  linked_task_id?: string;
  priority?: 'high' | 'medium' | 'low';
  estimated_minutes?: number;
}
