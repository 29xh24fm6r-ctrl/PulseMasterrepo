// Cerebellum v1 Types
// lib/cerebellum/types.ts

export interface MotorRoutineConfig {
  key?: string;
  name: string;
  description?: string;
  domain?: string;
  category?: string;
  source?: 'system_default' | 'autopilot_learned' | 'user_defined';
  config?: any;
}

export interface MotorRoutineStepBlueprint {
  stepIndex: number;
  kind: string;
  label?: string;
  params?: any;
  dependsOn?: number[];
  errorPolicy?: 'continue' | 'abort' | 'retry_later';
  retryConfig?: any;
}

export interface RoutineTriggerConfig {
  triggerType: 'time' | 'event' | 'state';
  schedule?: string;
  eventFilter?: any;
  stateCondition?: any;
}


