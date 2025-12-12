/**
 * Unified Organism Types
 * Single canonical data model for CRM + Second Brain + Intelligence
 */

export type EntityType = "person" | "organization" | "deal";

export type InteractionType = "email" | "call" | "sms" | "meeting" | "note" | "task" | "other";

export interface IdentityInput {
  email?: string;
  phone?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  domain?: string;
  organizationId?: string;
}

export interface IdentityResolution {
  contact_id: string | null;
  org_id: string | null;
  tb_node_id: string | null;
  confidence: "high" | "medium" | "low";
  did_create_contact: boolean;
  did_create_org: boolean;
  matched_by: ("email" | "phone" | "name" | "domain")[];
}

export interface InteractionInput {
  type: InteractionType;
  contact_id?: string;
  organization_id?: string;
  deal_id?: string;
  occurred_at: string;
  subject?: string;
  summary?: string;
  channel?: string;
  metadata?: {
    threadId?: string;
    messageId?: string;
    eventId?: string;
    callId?: string;
    source_type?: string;
    source_id?: string;
    [key: string]: any;
  };
}

export interface TaskInput {
  title: string;
  description?: string;
  due_date?: string;
  priority?: "low" | "medium" | "high";
  contact_id?: string;
  organization_id?: string;
  deal_id?: string;
  status?: "pending" | "in_progress" | "completed" | "cancelled";
}

export interface IntelFinding {
  query: string;
  source_url: string;
  source_title: string;
  retrieved_at: string;
  snippet: string;
  extracted_facts: Array<{
    key: string;
    value: string;
    confidence: number;
  }>;
  entities: Array<{
    type: "person" | "org" | "role" | "location" | "news" | "other";
    value: string;
  }>;
  risk_flags?: string[];
}

