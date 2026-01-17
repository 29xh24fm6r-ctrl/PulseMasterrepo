// Pulse Communications OS - Supabase Store
import { CallSession, CallStatus, CallDirection } from "./types";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export async function createCallSession(params: {
    clerkId: string;
    direction: CallDirection;
    fromNumber: string;
    toNumber: string;
    twilioCallSid?: string;
    contactId?: string;
    dealId?: string;
}): Promise<CallSession | null> {
    const { data: user } = await getSupabaseAdminRuntimeClient()
        .from("users")
        .select("id")
        .eq("clerk_id", params.clerkId)
        .single();

    if (!user) {
        console.log("❌ User not found for clerk_id:", params.clerkId);
        return null;
    }

    const { data, error } = await getSupabaseAdminRuntimeClient()
        .from("calls")
        .insert({
            user_id: user.id,
            direction: params.direction,
            from_number: params.fromNumber,
            to_number: params.toNumber,
            twilio_call_sid: params.twilioCallSid,
            contact_id: params.contactId,
        })
        .select()
        .single();

    if (error) {
        console.error("❌ Failed to create call:", error);
        return null;
    }

    console.log(`📞 Call session created: ${data.id} (${params.direction})`);
    return mapDbToCallSession(data);
}

export async function updateCallSessionBySid(
    twilioCallSid: string,
    patch: Partial<CallSession>
): Promise<CallSession | null> {
    const dbPatch = mapCallSessionToDb(patch);

    const { data, error } = await getSupabaseAdminRuntimeClient()
        .from("calls")
        .update(dbPatch)
        .eq("twilio_call_sid", twilioCallSid)
        .select()
        .single();

    if (error) {
        console.error("❌ Failed to update call by SID:", error);
        return null;
    }

    console.log(`📞 Call updated by SID: ${twilioCallSid}`);
    return mapDbToCallSession(data);
}

export async function updateCallSession(
    id: string,
    patch: Partial<CallSession>
): Promise<CallSession | null> {
    const dbPatch = mapCallSessionToDb(patch);

    const { data, error } = await getSupabaseAdminRuntimeClient()
        .from("calls")
        .update(dbPatch)
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error("❌ Failed to update call:", error);
        return null;
    }

    console.log(`📞 Call updated: ${id}`);
    return mapDbToCallSession(data);
}

export async function getCallSession(id: string): Promise<CallSession | null> {
    const { data, error } = await getSupabaseAdminRuntimeClient()
        .from("calls")
        .select()
        .eq("id", id)
        .single();

    if (error) return null;
    return mapDbToCallSession(data);
}

export async function getCallSessionBySid(twilioCallSid: string): Promise<CallSession | null> {
    const { data, error } = await getSupabaseAdminRuntimeClient()
        .from("calls")
        .select()
        .eq("twilio_call_sid", twilioCallSid)
        .single();

    if (error) return null;
    return mapDbToCallSession(data);
}

export async function listCallSessionsForUser(clerkId: string): Promise<CallSession[]> {
    const { data: user } = await getSupabaseAdminRuntimeClient()
        .from("users")
        .select("id")
        .eq("clerk_id", clerkId)
        .single();

    if (!user) return [];

    const { data, error } = await getSupabaseAdminRuntimeClient()
        .from("calls")
        .select()
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) return [];
    return data.map(mapDbToCallSession);
}

export async function getCallStats(clerkId: string) {
    const calls = await listCallSessionsForUser(clerkId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    return {
        totalCalls: calls.length,
        todayCalls: calls.filter((c) => c.startedAt >= todayStr).length,
        inboundCalls: calls.filter((c) => c.direction === "inbound").length,
        outboundCalls: calls.filter((c) => c.direction === "outbound").length,
        missedCalls: calls.filter((c) => c.status === "missed" || c.status === "voicemail").length,
        completedCalls: calls.filter((c) => c.status === "completed").length,
    };
}

function mapDbToCallSession(row: any): CallSession {
    return {
        id: row.id,
        userId: row.user_id,
        direction: row.direction,
        status: row.status || "initiating",
        from_number: row.from_number,
        toNumber: row.to_number,
        twilioCallSid: row.twilio_call_sid,
        contactId: row.contact_id,
        startedAt: row.created_at,
        endedAt: row.ended_at,
        durationSec: row.duration_sec,
        transcriptText: row.transcript,
        summaryShort: row.summary_short,
        summaryDetailed: row.summary_detailed,
        sentiment: row.sentiment,
        actionsJson: row.action_items,
        tags: row.tags,
    };
}

function mapCallSessionToDb(patch: Partial<CallSession>): any {
    const dbPatch: any = {};
    if (patch.status) dbPatch.status = patch.status;
    if (patch.endedAt) dbPatch.ended_at = patch.endedAt;
    if (patch.durationSec) dbPatch.duration_sec = patch.durationSec;
    if (patch.transcriptText) dbPatch.transcript = patch.transcriptText;
    if (patch.summaryShort) dbPatch.summary_short = patch.summaryShort;
    if (patch.summaryDetailed) dbPatch.summary_detailed = patch.summaryDetailed;
    if (patch.sentiment) dbPatch.sentiment = patch.sentiment;
    if (patch.actionsJson) dbPatch.action_items = patch.actionsJson;
    if (patch.tags) dbPatch.tags = patch.tags;
    return dbPatch;
}

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

export function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}
