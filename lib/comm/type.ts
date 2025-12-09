// Pulse Communications OS - Types

export type CallDirection = "inbound" | "outbound";

export type CallStatus = 
  | "initiating"
  | "queued"
  | "ringing"
  | "in-progress"
  | "completed"
  | "failed"
  | "busy"
  | "no-answer"
  | "canceled"
  | "voicemail";

export interface CallSession {
  id: string;
  userId: string;
  direction: CallDirection;
  status: CallStatus;
  fromNumber: string;
  toNumber: string;
  twilioCallSid?: string;
  contactId?: string;
  dealId?: string;
  contactName?: string;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  recordingUrl?: string;
  transcript?: string;
  summary?: string;
  voicemailText?: string;
  notes?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface SMSMessage {
  id: string;
  userId: string;
  direction: CallDirection;
  fromNumber: string;
  toNumber: string;
  body: string;
  twilioMessageSid?: string;
  contactId?: string;
  contactName?: string;
  timestamp: string;
  status: "queued" | "sent" | "delivered" | "failed" | "received";
  metadata?: Record<string, any>;
}