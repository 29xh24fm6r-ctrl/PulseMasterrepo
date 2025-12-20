// CRM Types (shared between server and client)
// lib/crm/types.ts

export interface Deal {
  id: string;
  name: string;
  stage: string;
  amount?: number;
  close_date?: string;
  primary_contact_id?: string;
  created_at: string;
  updated_at: string;
  contact_name?: string;
  task_count?: number;
}

export interface Task {
  id: string;
  title: string;
  due_at?: string;
  status: string;
  priority?: number;
  deal_id?: string;
  relationship_relevance?: string[];
}

export interface Activity {
  id: string;
  type: string;
  body?: string;
  subject?: string;
  summary?: string;
  occurred_at?: string;
  created_at: string;
  contact_id?: string;
  deal_id?: string;
}

export interface CrmOverviewData {
  ok: boolean;
  module: string;
  summary: string;
  pipeline: {
    stages: string[];
    dealsByStage: Record<string, Deal[]>;
  };
  tasks: {
    overdue: Task[];
    dueToday: Task[];
    dueSoon: Task[];
  };
  activity: Activity[];
  meta: {
    userIdUsed: string;
    clerkUserId: string;
  };
}
