import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
    const gate = await requireOpsAuth(req as any);
    if (!gate.ok || !gate.gate) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return withCompatTelemetry({
        req: req as any,
        userIdUuid: gate.gate.canon.userIdUuid,
        clerkUserId: gate.gate.canon.clerkUserId,
        eventName: "api.deals.enriched.get",
        handler: async () => {
            const dealsRes = await supabaseAdmin
                .from("deals" as any)
                .select("*")
                .eq("user_id_uuid", gate.canon.userIdUuid)
                .order("created_at", { ascending: false })
                .limit(200);

            if (dealsRes.error) throw dealsRes.error;

            const dealIds = (dealsRes.data ?? []).map((d: any) => d.id).filter(Boolean);

            // best-effort: fetch crm_deals that match either id OR deal_id if present.
            // We do NOT assume which column exists; we attempt both and merge results we get.
            let crmRows: any[] = [];

            // Try: crm_deals.deal_id IN (...)
            const crmTryDealId = await supabaseAdmin
                .from("crm_deals")
                .select("*")
                // @ts-ignore - may error if deal_id doesn't exist; we catch and continue
                .in("deal_id", dealIds);

            if (!crmTryDealId.error) crmRows = crmTryDealId.data ?? [];

            // Try: crm_deals.id IN (...) and merge
            const crmTryId = await supabaseAdmin
                .from("crm_deals")
                .select("*")
                .in("id", dealIds);

            if (!crmTryId.error) {
                const more = crmTryId.data ?? [];
                const seen = new Set(crmRows.map((r) => r.id));
                for (const r of more) if (!seen.has(r.id)) crmRows.push(r);
            }

            // Build lookup by (deal_id) if present, else by id
            const byDealId = new Map<string, any>();
            const byId = new Map<string, any>();
            for (const r of crmRows) {
                if (r.deal_id) byDealId.set(r.deal_id, r);
                if (r.id) byId.set(r.id, r);
            }

            const enriched = (dealsRes.data ?? []).map((d: any) => ({
                ...d,
                crm_row: byDealId.get(d.id) ?? byId.get(d.id) ?? null,
            }));

            return Response.json({ ok: true, deals: enriched }, { status: 200 });
        },
    });
}
