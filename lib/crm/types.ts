// CRM Types
// lib/crm/types.ts

export interface CrmContact {
  id: string;
  user_id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  primary_email?: string;
  primary_phone?: string;
  company_name?: string;
  title?: string;
  type?: string;
  tags: string[];
  timezone?: string;
  relationship_importance: number;
  created_at: string;
  updated_at: string;
}

export interface CrmOrganization {
  id: string;
  user_id: string;
  name: string;
  industry?: string;
  website?: string;
  size?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CrmDeal {
  id: string;
  user_id: string;
  name: string;
  stage: string;
  amount?: number;
  currency: string;
  close_date?: string;
  probability: number;
  source?: string;
  tags: string[];
  primary_contact_id?: string;
  organization_id?: string;
  pipeline: string;
  created_at: string;
  updated_at: string;
}

export interface CrmDealWithHealth extends CrmDeal {
  health?: {
    score: number;
    risk_level: number;
    last_interaction_at?: string;
    days_stalled?: number;
  };
}

export interface CrmInteraction {
  id: string;
  user_id: string;
  contact_id?: string;
  deal_id?: string;
  type: string;
  channel?: string;
  occurred_at: string;
  subject?: string;
  summary?: string;
  sentiment?: string;
  importance: number;
  created_at: string;
}

export interface RelationshipHealth {
  id: string;
  user_id: string;
  contact_id: string;
  score: number;
  last_interaction_at?: string;
  next_suggested_checkin_at?: string;
  momentum: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DealHealth {
  id: string;
  user_id: string;
  deal_id: string;
  score: number;
  risk_level: number;
  last_interaction_at?: string;
  days_stalled?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CrmAlert {
  id: string;
  user_id: string;
  type: string;
  contact_id?: string;
  deal_id?: string;
  title: string;
  body: string;
  severity: number;
  is_positive: boolean;
  created_at: string;
  seen_at?: string;
  dismissed_at?: string;
}

export interface RelationshipRadarItem {
  contactId: string;
  fullName: string;
  importance: number;
  healthScore: number;
  momentum: string;
  lastInteractionAt?: string;
  nextSuggestedCheckinAt?: string;
  reason: string;
}




