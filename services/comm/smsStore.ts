// Pulse Communications OS - SMS Store (Supabase)
import { SMSMessage, CallDirection } from "./types";
import { supabaseAdmin } from "@/lib/supabase";

export async function storeSMS(params: {
    clerkId?: string;
    direction: CallDirection;
    fromNumber: string;
    toNumber: string;
    body: string;
    twilioMessageSid?: string;
}): Promise<SMSMessage | null> {
    let userId = null;

    if (params.clerkId) {
        const { data: user } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("clerk_id", params.clerkId)
            .single();
        userId = user?.id;
    }

    // For inbound SMS, find user by phone number
    if (!userId && params.direction === "inbound") {
        const { data: user } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("phone", params.toNumber)
            .single();
        userId = user?.id;
    }

    const { data, error } = await supabaseAdmin
        .from("sms_messages")
        .insert({
            user_id: userId,
            direction: params.direction,
            from_number: params.fromNumber,
            to_number: params.toNumber,
            body: params.body,
            twilio_message_sid: params.twilioMessageSid,
        })
        .select()
        .single();

    if (error) {
        console.error("❌ Failed to store SMS:", error);
        return null;
    }

    console.log(`💬 SMS stored: ${data.id} (${params.direction})`);
    return mapDbToSMS(data);
}

export async function listSMS(clerkId: string): Promise<SMSMessage[]> {
    const { data: user } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("clerk_id", clerkId)
        .single();

    if (!user) return [];

    const { data, error } = await supabaseAdmin
        .from("sms_messages")
        .select()
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) return [];
    return data.map(mapDbToSMS);
}

export async function getSMSByPhone(clerkId: string, phoneNumber: string): Promise<SMSMessage[]> {
    const { data: user } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("clerk_id", clerkId)
        .single();

    if (!user) return [];

    const { data, error } = await supabaseAdmin
        .from("sms_messages")
        .select()
        .eq("user_id", user.id)
        .or(`from_number.eq.${phoneNumber},to_number.eq.${phoneNumber}`)
        .order("created_at", { ascending: true });

    if (error) return [];
    return data.map(mapDbToSMS);
}

export async function getSMSStats(clerkId: string) {
    const messages = await listSMS(clerkId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    return {
        totalMessages: messages.length,
        todayMessages: messages.filter((m) => m.receivedAt >= todayStr).length,
        inboundMessages: messages.filter((m) => m.direction === "inbound").length,
        outboundMessages: messages.filter((m) => m.direction === "outbound").length,
    };
}

function mapDbToSMS(row: any): SMSMessage {
    return {
        id: row.id,
        direction: row.direction,
        fromNumber: row.from_number,
        toNumber: row.to_number,
        body: row.body,
        twilioMessageSid: row.twilio_message_sid,
        receivedAt: row.created_at,
    };
}
