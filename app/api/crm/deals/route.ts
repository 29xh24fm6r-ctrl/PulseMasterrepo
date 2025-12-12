// CRM Deals API
// app/api/crm/deals/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { jsonOk, jsonError, handleRouteError } from "@/lib/api/routeErrors";
import { getDeals, upsertDeal } from "@/lib/crm/deals";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireClerkUserId();

    const searchParams = request.nextUrl.searchParams;
    const stage = searchParams.get("stage") || undefined;
    const pipeline = searchParams.get("pipeline") || undefined;
    const search = searchParams.get("search") || undefined;

    const deals = await getDeals(userId, { stage, pipeline, search });
    return jsonOk({ deals });
  } catch (err: unknown) {
    console.error("Failed to fetch deals:", err);
    return handleRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireClerkUserId();

    const body = await request.json();
    const deal = await upsertDeal(userId, body);
    return jsonOk({ deal });
  } catch (err: unknown) {
    console.error("Failed to upsert deal:", err);
    return handleRouteError(err);
  }
}




