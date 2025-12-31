// lib/events/writePulseEvent.ts
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

type PulseEventInput = {
    userIdUuid: string; // canonical identity_users.id
    eventName: string;

    // Default: now()
    createdAt?: string; // ISO string

    // Mirrors DB schema
    path?: string | null;
    method?: string | null;
    status?: number | null;
    latencyMs?: number | null;
    requestId?: string | null;
    sessionId?: string | null;
    featureId?: string | null;
    referrer?: string | null;
    userAgent?: string | null;

    // If you still store Clerk text id on events (you do: user_id text)
    userIdText?: string | null;

    // DB schema uses properties jsonb
    properties?: Record<string, any> | null;
};

function sha256Hex(input: string): string {
    return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Canonical fingerprint must match DB logic:
 * user_id_uuid | event_name | created_at | properties.entity_id | path | method
 */
function computeEventFingerprint(args: {
    userIdUuid: string;
    eventName: string;
    createdAtIso: string;
    properties?: Record<string, any> | null;
    path?: string | null;
    method?: string | null;
}): string {
    const entityId =
        (args.properties && (args.properties as any).entity_id) ||
        (args.properties && (args.properties as any).entityId) ||
        "";

    return sha256Hex(
        `${args.userIdUuid}|${args.eventName}|${args.createdAtIso}|${String(entityId)}|${args.path ?? ""}|${args.method ?? ""
        }`
    );
}

/**
 * Inserts an event with idempotency via DB unique index on event_fingerprint.
 * If the event already exists, we treat it as success.
 */
export async function writePulseEvent(input: PulseEventInput): Promise<{ ok: true; deduped: boolean }> {
    // Use admin client for writing events
    const supabase = supabaseAdmin;

    const createdAtIso = input.createdAt ?? new Date().toISOString();
    const properties = input.properties ?? {};

    const eventFingerprint = computeEventFingerprint({
        userIdUuid: input.userIdUuid,
        eventName: input.eventName,
        createdAtIso,
        properties,
        path: input.path ?? null,
        method: input.method ?? null,
    });

    const row: any = {
        user_id_uuid: input.userIdUuid,
        event_name: input.eventName,
        created_at: createdAtIso,
        properties,
        path: input.path ?? null,
        method: input.method ?? null,
        status: input.status ?? null,
        latency_ms: input.latencyMs ?? null,
        request_id: input.requestId ?? null,
        session_id: input.sessionId ?? null,
        feature_id: input.featureId ?? null,
        referrer: input.referrer ?? null,
        user_agent: input.userAgent ?? null,
        user_id: input.userIdText ?? null,
        event_fingerprint: eventFingerprint,
    };

    const { error } = await supabase.from("pulse_events").insert(row);

    if (error) {
        const msg = error.message.toLowerCase();
        // Covers: unique violation from the partial unique index
        if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("already exists")) {
            return { ok: true, deduped: true };
        }
        throw new Error(`writePulseEvent failed: ${error.message}`);
    }

    return { ok: true, deduped: false };
}
