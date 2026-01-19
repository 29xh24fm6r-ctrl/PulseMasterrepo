// Pulse Communications OS - Twilio Client
import twilio from "twilio";

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
import { ExecutionGate, ExecutionToken } from "@/lib/execution/ExecutionGate";
import { ExecutionIntentType } from "@/lib/execution/ExecutionIntent";

export const twilioClient = twilio(accountSid, authToken);

export const TWILIO_VOICE_NUMBER = process.env.TWILIO_VOICE_NUMBER || "+17629944252";
export const APP_BASE_URL = process.env.APP_BASE_URL || "https://pulseos-placeholder.com";

// Twilio webhook URLs
export const getWebhookUrls = () => ({
  voice: `${APP_BASE_URL}/api/calls/inbound`,
  voiceStatus: `${APP_BASE_URL}/api/calls/status`,
  voiceFallback: `${APP_BASE_URL}/api/calls/fallback`,
  sms: `${APP_BASE_URL}/api/sms/inbound`,
  outboundStatus: `${APP_BASE_URL}/api/calls/status`,
});

// TwiML Response helper
export const VoiceResponse = twilio.twiml.VoiceResponse;
export const MessagingResponse = twilio.twiml.MessagingResponse;

// Helper functions (migrated from lib/comm/twilio.ts)
export async function startOutboundCall(token: ExecutionToken, params: {
  toNumber: string;
  callbackUrl: string;
  statusCallbackUrl?: string;
}) {
  // HUMAN AGENCY LOCK
  if (!ExecutionGate.verify(token, ExecutionIntentType.SEND_MESSAGE)) {
    throw new Error("[AGENCY VIOLATION] Execution Blocked: Invalid or mismatched token for Outbound Call.");
  }

  const fromNumber = TWILIO_VOICE_NUMBER;
  if (!fromNumber) throw new Error("TWILIO_VOICE_NUMBER missing");

  return twilioClient.calls.create({
    to: params.toNumber,
    from: fromNumber,
    url: params.callbackUrl,
    statusCallback: params.statusCallbackUrl,
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    statusCallbackMethod: "POST",
  });
}

export async function sendSMS(token: ExecutionToken, params: {
  toNumber: string;
  body: string;
}) {
  // HUMAN AGENCY LOCK
  if (!ExecutionGate.verify(token, ExecutionIntentType.SEND_MESSAGE)) {
    throw new Error("[AGENCY VIOLATION] Execution Blocked: Invalid or mismatched token for SMS.");
  }

  const fromNumber = TWILIO_VOICE_NUMBER;
  if (!fromNumber) throw new Error("TWILIO_VOICE_NUMBER missing");

  return twilioClient.messages.create({
    to: params.toNumber,
    from: fromNumber,
    body: params.body,
  });
}
