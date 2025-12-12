// Unified Organism API - Organizations
// app/api/organism/organizations/route.ts

import { NextRequest } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { supabaseServer } from "@/lib/supabase/server";
import { jsonOk, handleRouteError } from "@/lib/api/routeErrors";
import { resolveIdentity } from "@/lib/organism";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireClerkUserId();
    const supabase = supabaseServer();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;

    let query = supabase
      .from("crm_organizations")
      .select("*")
      .eq("owner_user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (search) {
      query = query.or(`name.ilike.%${search}%,domain.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return jsonOk({ organizations: data || [] });
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireClerkUserId();
    const body = await request.json();

    const resolution = await resolveIdentity(userId, {
      company: body.name,
      domain: body.domain || body.website,
    });

    if (!resolution.org_id) {
      return jsonOk({ error: "Failed to resolve or create organization" }, { status: 500 });
    }

    const supabase = supabaseServer();
    const { data: org, error } = await supabase
      .from("crm_organizations")
      .select("*")
      .eq("owner_user_id", userId)
      .eq("id", resolution.org_id)
      .single();

    if (error) throw error;

    return jsonOk({
      organization: org,
      resolution: {
        did_create: resolution.did_create_org,
        matched_by: resolution.matched_by,
        tb_node_id: resolution.tb_node_id,
      },
    });
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}

