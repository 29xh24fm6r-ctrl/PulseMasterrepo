// Longitudinal Types (client-safe)
// lib/longitudinal/types.ts

export interface Snapshot {
  id: string;
  user_id: string;
  snapshot_type: "weekly" | "monthly" | "quarterly" | "yearly";
  period_start: string;
  period_end: string;
  avg_emotional_valence?: number;
  emotional_volatility?: number;
  dominant_emotions: string[];
  tasks_completed: number;
  avg_energy_level?: number;
  metrics_data: Record<string, any>;
  narrative_summary?: string;
}

export interface Trend {
  id: string;
  user_id: string;
  trend_type: "improving" | "declining" | "stable" | "cyclical";
  metric_name: string;
  description: string;
  confidence: number;
  slope?: number;
  data_points: Array<{ date: string; value: number }>;
}

export interface Chapter {
  id: string;
  user_id: string;
  chapter_title: string;
  start_date: string;
  end_date?: string;
  status: "active" | "completed" | "abandoned";
  primary_focus?: string;
  themes: string[];
  achievements: string[];
}

export interface Milestone {
  id: string;
  user_id: string;
  milestone_type: string;
  title: string;
  description?: string;
  occurred_at: string;
  significance_score: number;
}

export interface Trajectory {
  id: string;
  user_id: string;
  attribute_name: string;
  category?: string;
  current_level: number;
  target_level?: number;
  growth_rate?: number;
  history: Array<{ date: string; level: number; note?: string }>;
}

