// Autonomous Relationship Engine v2 Types
// lib/domains/relationships/v2/types.ts

import { LifeEvent } from "@/lib/cortex/longitudinal/types";
import { PulseCortexContext } from "@/lib/cortex/types";
import { MicroPlan } from "@/lib/cortex/executive";

export interface RelationshipState {
  personId: string;
  personName: string;
  lastContact: string | null;
  frequencyPattern: "daily" | "weekly" | "monthly" | "quarterly" | "irregular";
  emotionalAssociation: "positive" | "neutral" | "negative" | null;
  importanceScore: number; // 0-100
  riskScore: number; // 0-100
  opportunityScore: number; // 0-100
  history: LifeEvent[];
  relationshipScore: number; // From contacts table
  daysSinceInteraction: number;
  metadata?: Record<string, any>;
}

export interface RelationshipScores {
  health: number; // 0-100
  engagement: number; // 0-100
  value: number; // 0-100
  urgency: number; // 0-100
}

export interface RelationshipRisk {
  id: string;
  type: "neglect" | "conflict" | "cooling" | "gone_quiet" | "missed_opportunity";
  severity: "low" | "medium" | "high";
  description: string;
  recommendedAction: string;
  metadata?: Record<string, any>;
}

export interface RelationshipOpportunity {
  id: string;
  type: "birthday" | "promotion" | "crisis" | "milestone" | "reconnection_window";
  priority: "low" | "medium" | "high";
  description: string;
  suggestedAction: string;
  metadata?: Record<string, any>;
}

export interface RelationshipPlan {
  id: string;
  personId: string;
  personName: string;
  goal: "reconnect" | "repair" | "strengthen" | "strategic_value" | "maintain";
  microPlan: MicroPlan;
  estimatedDuration: number; // days
  successCriteria: string[];
  metadata?: Record<string, any>;
}



