import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { PlanItem } from "@/lib/runtime/types";
import { runtimeAuthIsRequired, getRuntimeAuthMode } from "@/lib/runtime/runtimeAuthPolicy";
import { previewRuntimeEnvelope } from "@/lib/runtime/previewRuntime";
import { runtimeHeaders } from "@/lib/runtime/runtimeHeaders";

export async function GET(req: NextRequest) {
    if (!runtimeAuthIsRequired()) {
        const body = previewRuntimeEnvelope({
            today: [],
            pending: [],
            recent: []
        });
        return new Response(JSON.stringify(body), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                ...runtimeHeaders({ auth: "bypassed" }),
                "x-pulse-runtime-auth-mode": getRuntimeAuthMode(),
                "x-pulse-src": "runtime_preview_envelope"
            }
        });
    }

    try {
        const { userId } = requireUser(req);
        const db = getSupabaseAdminRuntimeClient();

        const { data: effects, error } = await db
            .from('pulse_effects')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        const today: PlanItem[] = [];
        const pending: PlanItem[] = [];
        const recent: PlanItem[] = [];

        (effects || []).forEach((e: any) => {
            const item: PlanItem = {
                id: e.id,
                title: formatTitle(e.domain, e.action),
                status: mapStatus(e.status),
                type: inferType(e.domain),
                context: e.explanation
            };

            if (item.status === 'pending') {
                pending.push(item);
            } else if (item.status === 'approved' || item.status === 'completed') {
                today.push(item);
            } else {
                recent.push(item);
            }
        });

        return new Response(JSON.stringify({
            today,
            pending,
            recent
        }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                ...runtimeHeaders({ auth: "required" })
            }
        });

    } catch (err: any) {
        console.error("[Runtime] Error:", err);
        const status = err.status || 500;
        const msg = err.message || "Internal Error";
        const isAuthErr = status === 401;

        return new Response(JSON.stringify({ error: msg }), {
            status,
            headers: {
                "Content-Type": "application/json",
                ...runtimeHeaders({ auth: isAuthErr ? "missing" : "required" }),
                "x-pulse-src": "runtime_error_boundary"
            }
        });
    }
}

function mapStatus(dbStatus: string): PlanItem['status'] {
    if (dbStatus === 'queued' || dbStatus === 'proposed') return 'pending';
    if (dbStatus === 'applied' || dbStatus === 'approved') return 'approved';
    if (dbStatus === 'reverted' || dbStatus === 'declined') return 'declined';
    return 'pending'; // fallback
}

function inferType(domain: string): PlanItem['type'] {
    if (domain === 'calendar') return 'meeting';
    if (domain === 'tasks') return 'task';
    return 'routine';
}

function formatTitle(domain: string, action: string): string {
    // Basic humanizer
    return `${domain}: ${action}`.replace('_', ' ');
}
