// Unified Communications Types
// lib/comms/types.ts

export type SourceType = "email" | "sms" | "call" | "note";
export type ChannelType = "email" | "sms" | "call" | "other";

export interface CommsMessageInput {
  userId: string;
  channelType: "sms" | "call";
  externalId?: string | null; // provider id
  fromIdentity: string;
  toIdentity: string;
  occurredAt: Date;
  subject?: string | null;
  body: string; // SMS text or call transcript/summary
  rawData?: any;
  direction: "incoming" | "outgoing";
}

