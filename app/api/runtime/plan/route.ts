import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleRuntimeError } from "@/lib/auth/requireUser";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { PlanItem } from "@/lib/runtime/types";
import { runtimeAuthIsRequired, getRuntimeAuthMode } from "@/lib/runtime/runtimeAuthPolicy";
import { previewRuntimeEnvelope } from "@/lib/runtime/previewRuntime";

export async function GET(req: NextRequest) {
    if (!runtimeAuthIsRequired()) {
        const res = NextResponse.json(previewRuntimeEnvelope({
            today: [],
            pending: [],
            recent: []
        }));
        res.headers.set("x-pulse-runtime-auth-mode", getRuntimeAuthMode());
        res.headers.set("x-pulse-src", "runtime_preview_envelope");
        return res;
    }

    try {
        const { userId } = requireUser(req);
        const db = getSupabaseAdminRuntimeClient();

        // Fetch from pulse_effects (Phase 18)
        // where status = 'proposed' (pending) or 'approved' (today)
        // We map 'proposed' -> pending, 'approved' -> today/completed

        // Note: 'pulse_effects' schema usually has: status, action, domain, explanation.
        // We need to map this to PlanItem.

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
                // Check date if strictly today? For now, let's put recent approved in Today.
                today.push(item);
            } else {
                recent.push(item);
            }
        });

        return NextResponse.json({
            today,
            pending,
            recent
        });

    } catch (err) {
        const res = handleRuntimeError(err);
        if (res.status === 401) {
            res.headers.set("x-pulse-src", "runtime_auth_denied");
        }
        return res;
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
