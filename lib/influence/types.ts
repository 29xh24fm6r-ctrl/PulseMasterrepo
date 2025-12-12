// Influence Engine Types
// lib/influence/types.ts

export type InfluenceChannel = "email" | "sms" | "call" | "in_person";

export interface NextBestActionInput {
  userId: string;
  contactId: string;
  situation?: string; // free-text context (deal, conflict, follow-up, etc.)
}

export interface NextBestActionResult {
  suggested_channel: InfluenceChannel;
  suggested_summary: string;
  suggested_message: string;
  rationale: string;
  confidence: number; // 0..1
}

export interface RewriteMessageInput {
  userId: string;
  contactId: string;
  originalMessage: string;
  intent: "persuade" | "reassure" | "apologize" | "followup" | "update";
}

export interface RewriteMessageResult {
  rewritten_message: string;
  rationale: string;
}

