// Meta-Planner v1 Types
// lib/meta_planner/types.ts

export interface PlanningContextInput {
  kind: 'daily' | 'weekly' | 'conflict_resolution' | 'ad_hoc';
  triggerSource: string;
  consciousFrame?: any;
  conflicts?: any[];
  timelineContext?: any;
  destinyContext?: any;
  selfMirrorSnapshot?: any;
  emotionState?: any;
  somaticState?: any;
  socialState?: any;
  cultureContexts?: any[];
  tasksSnapshot?: any[];
  routinesSnapshot?: any[];
  calendarSnapshot?: any[];
}


