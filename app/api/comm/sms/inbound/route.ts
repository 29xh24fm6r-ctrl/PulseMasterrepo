// POST /api/comm/sms/inbound - Twilio webhook for incoming SMS
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { storeSMS } from "@/lib/comm/smsStore";
import { MessagingResponse } from "@/lib/comm/twilio";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const messageSid = formData.get("MessageSid") as string;
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;
    const body = formData.get("Body") as string;

    console.log(`💬 Inbound SMS from ${from}: ${body.substring(0, 50)}...`);

    // Store SMS in Supabase
    await storeSMS({
      direction: "inbound",
      fromNumber: from,
      toNumber: to,
      body,
      twilioMessageSid: messageSid,
    });

    // Return auto-response per spec
    const twiml = new MessagingResponse();
    twiml.message("Pulse received your message.");

    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error: any) {
    console.error("SMS inbound error:", error);

    const twiml = new MessagingResponse();
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }
}