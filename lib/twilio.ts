// Pulse Communications OS - Twilio Client
import twilio from "twilio";

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
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
