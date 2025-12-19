// app/api/deals/route.ts
// Supabase-only deals endpoint (migrated from Notion)
// Sprint 3B: Uses canonical resolveSupabaseUser()
// Updated: Returns shape expected by UI dashboards
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { log } from "@/lib/obs/logger";
import { getRequestMeta } from "@/lib/obs/request-context";
import { withApiAnalytics } from "@/lib/analytics/api";

export const dynamic = "force-dynamic";

// GET - List all deals for user
export async function GET(req: NextRequest) {
  return withApiAnalytics(req, async () => {
    const meta = getRequestMeta();
    const t0 = Date.now();
    log.info("route.start", { ...meta, route: "GET /api/deals" });

    try {
    const { supabaseUserId } = await resolveSupabaseUser();

    const { searchParams } = new URL(req.url);
    const stage = searchParams.get("stage"); // optional filter

    let query = supabaseAdmin
      .from("deals")
      .select("*")
      .eq("user_id", supabaseUserId)
      .order("close_date", { ascending: true, nullsLast: true })
      .order("created_at", { ascending: false });

    if (stage) {
      query = query.eq("stage", stage);
    }

    const { data: deals, error } = await query;

    if (error) throw error;

    // Return shape expected by UI dashboards
    const normalized = (deals || []).map((d: any) => ({
      id: d.id,
      name: d.name ?? d.title ?? "Untitled Deal",
      stage: d.stage ?? d.status ?? "open",
      amount: d.amount ?? d.value ?? 0,
      probability: d.probability ?? 50,
      contact_name: d.contact_name ?? d.person_name ?? null,
      last_activity: d.last_activity ?? d.updated_at ?? null,
      next_action: d.next_action ?? null,
    }));

      log.info("route.ok", { ...meta, route: "GET /api/deals", ms: Date.now() - t0, count: normalized.length });
      
      // Support both shapes: { items: [...] } for existing code, { deals: [...] } for new code
      const { searchParams } = new URL(req.url);
      const format = searchParams.get("format");
      if (format === "legacy") {
        return NextResponse.json({ items: normalized });
      }
      return NextResponse.json({ deals: normalized });
    } catch (err: any) {
      log.error("route.err", { ...meta, route: "GET /api/deals", ms: Date.now() - t0, error: err?.message || String(err) });
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  });
}

// POST - Create new deal
export async function POST(req: NextRequest) {
  return withApiAnalytics(req, async () => {
    const meta = getRequestMeta();
    const t0 = Date.now();
    log.info("route.start", { ...meta, route: "POST /api/deals" });

    try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const body = await req.json();

    // Ignore user_id if provided (server sets it)
    if (body.user_id) {
      delete body.user_id;
    }

    const { name, company, amount, stage, close_date, notes } = body;

    if (!name || !name.trim()) {
      log.warn("route.validation_failed", { ...meta, route: "POST /api/deals", ms: Date.now() - t0, error: "Name is required" });
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const { data: deal, error } = await supabaseAdmin
      .from("deals")
      .insert({
        user_id: supabaseUserId,
        name: name.trim(),
        company: company?.trim() || null,
        amount: amount ? parseFloat(amount) : null,
        stage: stage || "prospect",
        close_date: close_date || null,
        notes: notes?.trim() || null,
      })
      .select("*")
      .single();

    if (error) throw error;

      log.info("route.ok", { ...meta, route: "POST /api/deals", ms: Date.now() - t0, dealId: deal?.id });
      return NextResponse.json({ item: deal }, { status: 200 });
    } catch (err: any) {
      log.error("route.err", { ...meta, route: "POST /api/deals", ms: Date.now() - t0, error: err?.message || String(err) });
      return NextResponse.json({ error: err.message || "Failed to create deal" }, { status: 500 });
    }
  });
}
