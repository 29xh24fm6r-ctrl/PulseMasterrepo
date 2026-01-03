import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";
import { supabaseAdmin } from "@/lib/supabase";

async function ensureDefaultStages(userIdUuid: string) {
    const { data, error } = await supabaseAdmin
        .from("deal_stages")
        .select("id,key,label,sort_order")
        .eq("user_id_uuid", userIdUuid)
        .order("sort_order", { ascending: true });

    if (error) throw error;
    if ((data ?? []).length) return data ?? [];

    const defaults = [
        { key: "prospect", label: "Prospect", sort_order: 10 },
        { key: "discovery", label: "Discovery", sort_order: 20 },
        { key: "underwriting", label: "Underwriting", sort_order: 30 },
        { key: "approved", label: "Approved", sort_order: 40 },
        { key: "closed", label: "Closed", sort_order: 50 },
    ].map((s) => ({ ...s, user_id_uuid: userIdUuid }));

    const ins = await supabaseAdmin.from("deal_stages").insert(defaults).select("id,key,label,sort_order");
    if (ins.error) throw ins.error;
    return ins.data ?? [];
}

export async function GET(req: Request) {
    const gate = await requireOpsAuth(req as any);
    if (!gate.ok || !gate.gate) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return withCompatTelemetry({
        req: req as any,
        userIdUuid: gate.gate.canon.userIdUuid,
        clerkUserId: gate.gate.canon.clerkUserId,
        eventName: "api.deals.pipeline.get",
        handler: async () => {
            const stages = await ensureDefaultStages(gate.gate.canon.userIdUuid);
            const stageKeys = new Set(stages.map((s: any) => s.key));

            const { data: deals, error } = await supabaseAdmin
                .from("deals")
                .select("*")
                .eq("user_id_uuid", gate.gate.canon.userIdUuid)
                .order("created_at", { ascending: false })
                .limit(200);

            if (error) throw error;

            const normalized = (deals ?? []).map((d: any) => {
                const stage = d.stage && stageKeys.has(d.stage) ? d.stage : "prospect";
                return { ...d, stage };
            });

            const dealsByStage: Record<string, any[]> = {};
            for (const s of stages) dealsByStage[(s as any).key] = [];
            for (const d of normalized) dealsByStage[(d as any).stage].push(d);

            return Response.json({ ok: true, stages, dealsByStage }, { status: 200 });
        },
    });
}
