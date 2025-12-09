// Pulse Communications OS - Types (v1 Spec)

export type CallDirection = "inbound" | "outbound";

export type CallStatus =
  | "initiating"
  | "ringing"
  | "in_progress"
  | "completed"
  | "missed"
  | "voicemail"
  | "failed";

export interface CallSession {
  id: string;
  userId: string; // temporary: "demo-user"
  direction: CallDirection;
  status: CallStatus;

  fromNumber: string;
  toNumber: string;

  twilioCallSid?: string;

  contactId?: string;
  dealId?: string;

  startedAt: string;
  endedAt?: string;
  durationSec?: number;

  transcriptText?: string;
  summaryShort?: string;
  summaryDetailed?: string;
  sentiment?: "positive" | "neutral" | "negative";
  tags?: string[];
  actionsJson?: any;
}

export interface SMSMessage {
  id: string;
  direction: CallDirection;
  fromNumber: string;
  toNumber: string;
  body: string;
  twilioMessageSid?: string;
  receivedAt: string;
}
