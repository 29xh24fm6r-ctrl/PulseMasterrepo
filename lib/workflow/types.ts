
import { Database } from "@/types/supabase";

export type WorkflowStatus =
    | 'queued'
    | 'running'
    | 'paused'
    | 'waiting'
    | 'succeeded'
    | 'failed'
    | 'canceled';

export type StepRisk = 'read' | 'write';
export type ExecutorKind = 'web.playwright' | 'phone.twilio' | 'delivery.track';

export interface WorkflowStep {
    step_id: string;
    executor_kind: ExecutorKind;
    risk: StepRisk;
    mobile_allowed: boolean;
    requires_confirmation?: boolean;
}

export interface WorkflowPlan {
    workflow_id: string;
    risk_class: 'bounded' | 'sensitive';
    steps: WorkflowStep[];
}

export type WorkflowRunRow = Database['public']['Tables']['workflow_runs']['Row'];

export interface WorkflowContext {
    [key: string]: any;
}
