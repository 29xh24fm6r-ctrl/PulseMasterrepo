import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/runtime/requireUserId";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { PlanItem } from "@/lib/runtime/types";
import { runtimeAuthIsRequired } from "@/lib/runtime/runtimeAuthPolicy";
import { previewRuntimeEnvelope } from "@/lib/runtime/previewRuntime";
import { runtimeHeaders, PulseAuthHeader } from "@/lib/runtime/runtimeHeaders";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
    let status = 200;
    let auth: PulseAuthHeader = "required";
    let body: any;

    if (!runtimeAuthIsRequired()) {
        body = previewRuntimeEnvelope({
            today: [],
            pending: [],
            recent: []
        });
        auth = "bypassed";
    } else {
        try {
            const userId = await requireUserId(req);
            if (!userId) {
                status = 401;
                auth = "missing";
                body = { error: "User identity missing" };
                const customHeaders = runtimeHeaders({ auth });
                const response = NextResponse.json(body, { status });
                Object.entries(customHeaders).forEach(([key, value]) => {
                    response.headers.set(key, value);
                });
                return response;
            }

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

            body = {
                today,
                pending,
                recent
            };
            auth = "required";

        } catch (err: any) {
            console.error("[Runtime] Error:", err);
            status = err.status || 500;
            const msg = err.message || "Internal Error";
            if (status === 401) {
                auth = "missing";
            }
            body = { error: msg };
        }
    }

    const customHeaders = runtimeHeaders({ auth });

    // Create response first
    const response = NextResponse.json(body, { status });

    // Set headers explicitly
    Object.entries(customHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    return response;
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
