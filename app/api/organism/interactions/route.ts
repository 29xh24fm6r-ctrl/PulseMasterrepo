// Unified Organism API - Interactions
// app/api/organism/interactions/route.ts

import { NextRequest } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { supabaseServer } from "@/lib/supabase/server";
import { jsonOk, handleRouteError } from "@/lib/api/routeErrors";
import { logInteraction, InteractionInput } from "@/lib/organism";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireClerkUserId();
    const supabase = supabaseServer();

    const searchParams = request.nextUrl.searchParams;
    const contact_id = searchParams.get("contact_id") || undefined;
    const organization_id = searchParams.get("organization_id") || undefined;
    const deal_id = searchParams.get("deal_id") || undefined;
    const type = searchParams.get("type") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;

    let query = supabase
      .from("crm_interactions")
      .select(`
        *,
        contact:crm_contacts(full_name, primary_email),
        organization:crm_organizations(name),
        deal:crm_deals(name)
      `)
      .eq("owner_user_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (contact_id) query = query.eq("contact_id", contact_id);
    if (organization_id) query = query.eq("organization_id", organization_id);
    if (deal_id) query = query.eq("deal_id", deal_id);
    if (type) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) throw error;

    return jsonOk({ interactions: data || [] });
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireClerkUserId();
    const body = await request.json();

    const input: InteractionInput = {
      type: body.type,
      contact_id: body.contact_id,
      organization_id: body.organization_id,
      deal_id: body.deal_id,
      occurred_at: body.occurred_at || new Date().toISOString(),
      subject: body.subject,
      summary: body.summary,
      channel: body.channel,
      metadata: body.metadata || {},
    };

    const result = await logInteraction(userId, input);

    return jsonOk({
      interaction_id: result.interaction_id,
      memory_fragment_id: result.memory_fragment_id,
      message: "Interaction logged and indexed in Second Brain",
    });
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}

