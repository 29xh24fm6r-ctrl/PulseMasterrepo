import { NextRequest } from "next/server";
import { SCRIPTS } from "@/services/executors/twilio/scripts";
// import VoiceResponse from "twilio/lib/twiml/VoiceResponse"; // Can't import types easily in Edge/Next sometimes without full SDK

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { script: string } }) {
    const script = SCRIPTS[params.script];
    if (!script) return new Response("Script not found", { status: 404 });

    // Dynamic import to be safe
    const { default: VoiceResponse } = await import("twilio/lib/twiml/VoiceResponse");
    const twiml = new VoiceResponse();

    twiml.say(script.initial_say);

    // Simple record for V1
    twiml.record({
        maxLength: 30,
        action: `/api/voice/twilio/status?script=${params.script}`
    });

    return new Response(twiml.toString(), {
        headers: { "Content-Type": "text/xml" }
    });
}
