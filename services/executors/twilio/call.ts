import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { SCRIPTS } from "./scripts";

// Runtime-only import to avoid build crashes
async function getTwilioClient() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) throw new Error("Missing Twilio credentials");
    const { Twilio } = await import("twilio");
    return new Twilio(accountSid, authToken);
}

export async function startCall(args: {
    to: string;
    script_id: string;
    run_id: string; // correlate
}) {
    const client = await getTwilioClient();
    const from = process.env.TWILIO_FROM_NUMBER;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://pulse-os.com";

    if (!SCRIPTS[args.script_id]) throw new Error("Invalid script ID");

    const call = await client.calls.create({
        to: args.to,
        from: from!,
        url: \`\${baseUrl}/api/voice/twiml/\${args.script_id}?run_id=\${args.run_id}\`,
        statusCallback: \`\${baseUrl}/api/voice/twilio/status?run_id=\${args.run_id}\`,
        statusCallbackEvent: ['completed', 'failed', 'busy', 'no-answer']
    });

    return { callSid: call.sid };
}
