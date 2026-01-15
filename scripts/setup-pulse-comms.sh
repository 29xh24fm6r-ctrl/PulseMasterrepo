#!/bin/bash
# Pulse Communications OS - Setup Script
# Run this from your pulse-os-dashboard root directory

echo "📞 Setting up Pulse Communications OS..."

# Create directories
mkdir -p app/calls
mkdir -p app/api/calls/outbound
mkdir -p app/api/calls/inbound/voicemail
mkdir -p app/api/calls/status
mkdir -p "app/api/calls/[id]/summarize"
mkdir -p app/api/sms/inbound
mkdir -p app/api/sms/send

echo "✅ Directories created"

# Create lib/twilio.ts
cat > lib/twilio.ts << 'EOF'
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
EOF

echo "✅ lib/twilio.ts created"

# Create lib/call-store.ts
cat > lib/call-store.ts << 'EOF'
// Pulse Communications OS - Call Session Types & Store

export type CallDirection = "inbound" | "outbound";
export type CallStatus = "queued" | "ringing" | "in-progress" | "completed" | "failed" | "busy" | "no-answer" | "canceled" | "voicemail";

export interface CallSession {
  id: string;
  direction: CallDirection;
  status: CallStatus;
  from: string;
  to: string;
  fromFormatted?: string;
  toFormatted?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  recordingUrl?: string;
  transcript?: string;
  summary?: string;
  tags?: string[];
  contactId?: string;
  contactName?: string;
  notes?: string;
  voicemailText?: string;
  metadata?: Record<string, any>;
}

export interface SMSMessage {
  id: string;
  direction: CallDirection;
  from: string;
  to: string;
  body: string;
  timestamp: Date;
  status: "sent" | "delivered" | "failed" | "received";
  contactId?: string;
  contactName?: string;
}

class CallStore {
  private calls: Map<string, CallSession> = new Map();
  private messages: Map<string, SMSMessage> = new Map();

  createCall(call: CallSession): CallSession {
    this.calls.set(call.id, call);
    console.log(`📞 Call created: ${call.id} (${call.direction})`);
    return call;
  }

  getCall(id: string): CallSession | undefined {
    return this.calls.get(id);
  }

  updateCall(id: string, updates: Partial<CallSession>): CallSession | undefined {
    const call = this.calls.get(id);
    if (!call) return undefined;
    const updated = { ...call, ...updates };
    this.calls.set(id, updated);
    console.log(`📞 Call updated: ${id} -> ${updates.status || 'updated'}`);
    return updated;
  }

  getAllCalls(): CallSession[] {
    return Array.from(this.calls.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  getRecentCalls(limit: number = 20): CallSession[] {
    return this.getAllCalls().slice(0, limit);
  }

  createMessage(msg: SMSMessage): SMSMessage {
    this.messages.set(msg.id, msg);
    console.log(`💬 SMS created: ${msg.id} (${msg.direction})`);
    return msg;
  }

  getMessage(id: string): SMSMessage | undefined {
    return this.messages.get(id);
  }

  getAllMessages(): SMSMessage[] {
    return Array.from(this.messages.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getRecentMessages(limit: number = 50): SMSMessage[] {
    return this.getAllMessages().slice(0, limit);
  }

  getConversation(phoneNumber: string): SMSMessage[] {
    return this.getAllMessages()
      .filter(m => m.from === phoneNumber || m.to === phoneNumber)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  getStats() {
    const calls = this.getAllCalls();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      totalCalls: calls.length,
      todayCalls: calls.filter(c => c.startTime >= today).length,
      inboundCalls: calls.filter(c => c.direction === "inbound").length,
      outboundCalls: calls.filter(c => c.direction === "outbound").length,
      missedCalls: calls.filter(c => c.status === "no-answer" || c.status === "voicemail").length,
      totalMessages: this.messages.size,
    };
  }
}

export const callStore = new CallStore();

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned[0] === "1") {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

export function calculateDuration(start: Date, end?: Date): number {
  if (!end) return 0;
  return Math.floor((end.getTime() - start.getTime()) / 1000);
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
EOF

echo "✅ lib/call-store.ts created"

# Create app/api/calls/route.ts
cat > app/api/calls/route.ts << 'EOF'
import { NextResponse } from "next/server";
import { callStore } from "@/lib/call-store";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const direction = url.searchParams.get("direction") as "inbound" | "outbound" | null;
    const status = url.searchParams.get("status");

    let calls = callStore.getAllCalls();
    if (direction) calls = calls.filter(c => c.direction === direction);
    if (status) calls = calls.filter(c => c.status === status);
    calls = calls.slice(0, limit);

    const stats = callStore.getStats();
    return NextResponse.json({ calls, stats, total: calls.length });
  } catch (error: any) {
    console.error("List calls error:", error);
    return NextResponse.json({ error: error.message || "Failed to list calls" }, { status: 500 });
  }
}
EOF

echo "✅ app/api/calls/route.ts created"

# Create app/api/calls/outbound/route.ts
cat > app/api/calls/outbound/route.ts << 'EOF'
import { NextResponse } from "next/server";
import { twilioClient, TWILIO_VOICE_NUMBER, getWebhookUrls, VoiceResponse } from "@/lib/twilio";
import { callStore, CallSession, formatPhoneNumber } from "@/lib/call-store";

export async function POST(request: Request) {
  try {
    const { to, contactName } = await request.json();
    if (!to) return NextResponse.json({ error: "Phone number required" }, { status: 400 });

    const cleanedNumber = to.replace(/\D/g, "");
    const formattedTo = cleanedNumber.length === 10 ? `+1${cleanedNumber}` : cleanedNumber.startsWith("1") ? `+${cleanedNumber}` : `+${cleanedNumber}`;

    const webhooks = getWebhookUrls();
    const twiml = new VoiceResponse();
    twiml.say({ voice: "alice" }, "Connecting your call through Pulse.");
    twiml.dial({ callerId: TWILIO_VOICE_NUMBER, timeout: 30 }, formattedTo);

    const call = await twilioClient.calls.create({
      to: formattedTo,
      from: TWILIO_VOICE_NUMBER,
      twiml: twiml.toString(),
      statusCallback: webhooks.outboundStatus,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
      record: true,
    });

    const session: CallSession = {
      id: call.sid,
      direction: "outbound",
      status: "queued",
      from: TWILIO_VOICE_NUMBER,
      to: formattedTo,
      fromFormatted: "Pulse",
      toFormatted: contactName || formatPhoneNumber(formattedTo),
      startTime: new Date(),
      contactName,
    };
    callStore.createCall(session);

    return NextResponse.json({ success: true, callSid: call.sid, status: call.status, to: formattedTo });
  } catch (error: any) {
    console.error("Outbound call error:", error);
    return NextResponse.json({ error: error.message || "Failed to make call" }, { status: 500 });
  }
}
EOF

echo "✅ app/api/calls/outbound/route.ts created"

# Create app/api/calls/inbound/route.ts
cat > app/api/calls/inbound/route.ts << 'EOF'
import { NextResponse } from "next/server";
import { VoiceResponse, getWebhookUrls } from "@/lib/twilio";
import { callStore, CallSession, formatPhoneNumber } from "@/lib/call-store";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const callSid = formData.get("CallSid") as string;
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;

    console.log(`📞 Inbound call: ${callSid} from ${from}`);

    const session: CallSession = {
      id: callSid,
      direction: "inbound",
      status: "ringing",
      from,
      to,
      fromFormatted: formatPhoneNumber(from),
      toFormatted: "Pulse",
      startTime: new Date(),
    };
    callStore.createCall(session);

    const twiml = new VoiceResponse();
    const webhooks = getWebhookUrls();

    twiml.say({ voice: "alice" }, "Hello! You've reached Pulse. Please hold while I connect you.");
    const gather = twiml.gather({ numDigits: 1, timeout: 5, action: `${webhooks.voice}/menu` });
    gather.say({ voice: "alice" }, "Press 1 to leave a message, or stay on the line.");
    twiml.redirect(`${webhooks.voice}/voicemail?CallSid=${callSid}`);

    return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
  } catch (error: any) {
    console.error("Inbound call error:", error);
    const twiml = new VoiceResponse();
    twiml.say({ voice: "alice" }, "Sorry, we're experiencing technical difficulties. Please try again later.");
    twiml.hangup();
    return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
  }
}
EOF

echo "✅ app/api/calls/inbound/route.ts created"

# Create app/api/calls/inbound/voicemail/route.ts
cat > app/api/calls/inbound/voicemail/route.ts << 'EOF'
import { NextResponse } from "next/server";
import { VoiceResponse, APP_BASE_URL } from "@/lib/twilio";
import { callStore } from "@/lib/call-store";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const formData = await request.formData();
    const callSid = url.searchParams.get("CallSid") || formData.get("CallSid") as string;
    const recordingUrl = formData.get("RecordingUrl") as string;
    const recordingDuration = formData.get("RecordingDuration") as string;

    if (recordingUrl && callSid) {
      callStore.updateCall(callSid, {
        status: "voicemail",
        recordingUrl: recordingUrl + ".mp3",
        voicemailText: "[Voicemail transcription pending]",
        duration: parseInt(recordingDuration) || 0,
      });
    }

    const twiml = new VoiceResponse();
    if (!recordingUrl) {
      twiml.say({ voice: "alice" }, "Please leave a message after the beep. Press pound when finished.");
      twiml.record({
        maxLength: 120,
        playBeep: true,
        finishOnKey: "#",
        recordingStatusCallback: `${APP_BASE_URL}/api/calls/inbound/voicemail?CallSid=${callSid}`,
        recordingStatusCallbackMethod: "POST",
        transcribe: true,
        transcribeCallback: `${APP_BASE_URL}/api/calls/transcription?CallSid=${callSid}`,
      });
      twiml.say({ voice: "alice" }, "I did not receive a recording. Goodbye.");
      twiml.hangup();
    } else {
      twiml.say({ voice: "alice" }, "Thank you for your message. Goodbye!");
      twiml.hangup();
    }

    return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
  } catch (error: any) {
    console.error("Voicemail error:", error);
    const twiml = new VoiceResponse();
    twiml.say({ voice: "alice" }, "Sorry, voicemail is unavailable. Goodbye.");
    twiml.hangup();
    return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
  }
}
EOF

echo "✅ app/api/calls/inbound/voicemail/route.ts created"

# Create app/api/calls/status/route.ts
cat > app/api/calls/status/route.ts << 'EOF'
import { NextResponse } from "next/server";
import { callStore, CallStatus, calculateDuration } from "@/lib/call-store";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const callSid = formData.get("CallSid") as string;
    const callStatus = formData.get("CallStatus") as string;
    const callDuration = formData.get("CallDuration") as string;
    const recordingUrl = formData.get("RecordingUrl") as string;

    console.log(`📞 Status update: ${callSid} -> ${callStatus}`);

    const statusMap: Record<string, CallStatus> = {
      "queued": "queued", "initiated": "queued", "ringing": "ringing",
      "in-progress": "in-progress", "completed": "completed", "failed": "failed",
      "busy": "busy", "no-answer": "no-answer", "canceled": "canceled",
    };

    const status = statusMap[callStatus] || "completed";
    const updates: any = { status };

    if (["completed", "failed", "busy", "no-answer", "canceled"].includes(callStatus)) {
      updates.endTime = new Date();
      if (callDuration) updates.duration = parseInt(callDuration);
    }
    if (recordingUrl) updates.recordingUrl = recordingUrl + ".mp3";

    const call = callStore.getCall(callSid);
    if (call) {
      if (!updates.duration && updates.endTime) {
        updates.duration = calculateDuration(call.startTime, updates.endTime);
      }
      callStore.updateCall(callSid, updates);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Status callback error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
EOF

echo "✅ app/api/calls/status/route.ts created"

# Create app/api/calls/[id]/route.ts
cat > "app/api/calls/[id]/route.ts" << 'EOF'
import { NextResponse } from "next/server";
import { callStore } from "@/lib/call-store";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const call = callStore.getCall(id);
    if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });
    return NextResponse.json({ call });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const updates = await request.json();
    const allowedFields = ["notes", "tags", "contactId", "contactName", "summary"];
    const filteredUpdates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) filteredUpdates[field] = updates[field];
    }
    const call = callStore.updateCall(id, filteredUpdates);
    if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });
    return NextResponse.json({ call });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
EOF

echo "✅ app/api/calls/[id]/route.ts created"

# Create app/api/calls/[id]/summarize/route.ts
cat > "app/api/calls/[id]/summarize/route.ts" << 'EOF'
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { callStore } from "@/lib/call-store";

const openai = new OpenAI();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const call = callStore.getCall(id);
    if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });

    const content = call.transcript || call.voicemailText;
    if (!content || content.includes("[pending]")) {
      return NextResponse.json({ error: "No transcript available" }, { status: 400 });
    }

    const prompt = `Summarize this phone call concisely:
Direction: ${call.direction}
From: ${call.fromFormatted || call.from}
Duration: ${call.duration ? Math.floor(call.duration / 60) + " min" : "Unknown"}
Transcript: ${content}

Provide: 1) Summary (2-3 sentences) 2) Action Items 3) Follow-up needed?`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
    });

    const summary = completion.choices[0]?.message?.content || "Unable to generate summary.";
    callStore.updateCall(id, { summary });

    return NextResponse.json({ success: true, summary, callId: id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
EOF

echo "✅ app/api/calls/[id]/summarize/route.ts created"

# Create app/api/sms/inbound/route.ts
cat > app/api/sms/inbound/route.ts << 'EOF'
import { NextResponse } from "next/server";
import { MessagingResponse } from "@/lib/twilio";
import { callStore, SMSMessage } from "@/lib/call-store";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const messageSid = formData.get("MessageSid") as string;
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;
    const body = formData.get("Body") as string;

    console.log(`💬 Inbound SMS from ${from}: ${body.substring(0, 50)}...`);

    const message: SMSMessage = {
      id: messageSid,
      direction: "inbound",
      from, to, body,
      timestamp: new Date(),
      status: "received",
    };
    callStore.createMessage(message);

    const twiml = new MessagingResponse();
    twiml.message("Thanks for your message! I'll get back to you shortly. - Sent via Pulse");

    return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
  } catch (error: any) {
    console.error("SMS inbound error:", error);
    const twiml = new MessagingResponse();
    return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
  }
}
EOF

echo "✅ app/api/sms/inbound/route.ts created"

# Create app/api/sms/send/route.ts
cat > app/api/sms/send/route.ts << 'EOF'
import { NextResponse } from "next/server";
import { twilioClient, TWILIO_VOICE_NUMBER } from "@/lib/twilio";
import { callStore, SMSMessage } from "@/lib/call-store";

export async function POST(request: Request) {
  try {
    const { to, body, contactName } = await request.json();
    if (!to || !body) return NextResponse.json({ error: "Phone and body required" }, { status: 400 });

    const cleanedNumber = to.replace(/\D/g, "");
    const formattedTo = cleanedNumber.length === 10 ? `+1${cleanedNumber}` : `+${cleanedNumber}`;

    const message = await twilioClient.messages.create({
      to: formattedTo,
      from: TWILIO_VOICE_NUMBER,
      body,
    });

    const smsRecord: SMSMessage = {
      id: message.sid,
      direction: "outbound",
      from: TWILIO_VOICE_NUMBER,
      to: formattedTo,
      body,
      timestamp: new Date(),
      status: "sent",
      contactName,
    };
    callStore.createMessage(smsRecord);

    return NextResponse.json({ success: true, messageSid: message.sid, to: formattedTo });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const phone = url.searchParams.get("phone");
  const messages = phone ? callStore.getConversation(phone) : callStore.getRecentMessages(limit);
  return NextResponse.json({ messages, total: messages.length });
}
EOF

echo "✅ app/api/sms/send/route.ts created"

# Create the calls page (this is long, so we'll download it separately)
echo "📥 Downloading calls page..."

echo "✅ All API routes created!"

# Install twilio
echo ""
echo "📦 Installing Twilio SDK..."
npm install twilio

echo ""
echo "🎉 Pulse Communications OS setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Add to .env.local:"
echo "   TWILIO_ACCOUNT_SID=your_sid"
echo "   TWILIO_AUTH_TOKEN=your_token"
echo "   TWILIO_VOICE_NUMBER=+17629944252"
echo "   APP_BASE_URL=https://your-app.com"
echo ""
echo "2. Download the calls page from Claude outputs"
echo "3. Configure Twilio webhooks in your console"
echo "4. Run: npm run dev"
echo "5. Visit: http://localhost:3000/calls"
