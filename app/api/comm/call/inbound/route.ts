// POST /api/comm/call/inbound - Twilio webhook for incoming calls
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { supabaseAdmin } from "@/lib/supabase";
import { VoiceResponse, APP_BASE_URL } from "@/services/twilio";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const callSid = formData.get("CallSid") as string;
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;

    console.log(`📞 Inbound call: ${callSid} from ${from}`);

    // Find user by their Twilio number
    const { data: user } = await (supabaseAdmin as any)
      .from("users")
      .select("id")
      .eq("phone", to)
      .single();

    // Create call record
    const { data: call } = await (supabaseAdmin as any)
      .from("calls")
      .insert({
        user_id: user?.id || null,
        direction: "inbound",
        from_number: from,
        to_number: to,
        twilio_call_sid: callSid,
      })
      .select()
      .single();

    const sessionId = call?.id || "unknown";

    // Return TwiML with Stream to local WebSocket Server (via ngrok in dev)
    const twiml = new VoiceResponse();
    const connect = twiml.connect();
    // In dev, you must set NGROK_URL in env. In prod, this is your real domain.
    const wsUrl = process.env.NGROK_URL
      ? `${process.env.NGROK_URL.replace('http', 'ws')}/`
      : `wss://${request.headers.get('host')}/`;

    console.log(`🔗 Connecting Twilio Stream to: ${wsUrl}`);

    connect.stream({
      url: wsUrl,
      track: "inbound_track"
    });

    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error: any) {
    console.error("Inbound call error:", error);

    const twiml = new VoiceResponse();
    twiml.say({ voice: "alice" }, "Sorry, we're experiencing technical difficulties.");
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }
}