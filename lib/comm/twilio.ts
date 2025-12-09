// Pulse Communications OS - Twilio Helper (v1 Spec)
// TODO: Add Twilio request signature validation

import twilio from "twilio";

const getTwilioClient = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("Twilio env vars missing");
  return twilio(sid, token);
};

export const twilioClient = getTwilioClient;

export const TWILIO_VOICE_NUMBER = process.env.TWILIO_VOICE_NUMBER || "+17629944252";
export const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

export async function startOutboundCall(params: {
  toNumber: string;
  callbackUrl: string;
  statusCallbackUrl?: string;
}) {
  const fromNumber = process.env.TWILIO_VOICE_NUMBER;
  if (!fromNumber) throw new Error("TWILIO_VOICE_NUMBER missing");
  
  const client = getTwilioClient();
  return client.calls.create({
    to: params.toNumber,
    from: fromNumber,
    url: params.callbackUrl,
    statusCallback: params.statusCallbackUrl,
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    statusCallbackMethod: "POST",
  });
}

export async function sendSMS(params: {
  toNumber: string;
  body: string;
}) {
  const fromNumber = process.env.TWILIO_VOICE_NUMBER;
  if (!fromNumber) throw new Error("TWILIO_VOICE_NUMBER missing");
  
  const client = getTwilioClient();
  return client.messages.create({
    to: params.toNumber,
    from: fromNumber,
    body: params.body,
  });
}

// TwiML Response helpers
export const VoiceResponse = twilio.twiml.VoiceResponse;
export const MessagingResponse = twilio.twiml.MessagingResponse;
