// CRM Contacts API
// app/api/crm/contacts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { jsonOk, handleRouteError } from "@/lib/api/routeErrors";
import { getContacts, upsertContact } from "@/lib/crm/contacts";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireClerkUserId();

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || undefined;
    const search = searchParams.get("search") || undefined;
    const tag = searchParams.get("tag") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;

    const contacts = await getContacts(userId, { type, search, tag, limit });
    return jsonOk({ contacts });
  } catch (err: unknown) {
    console.error("Failed to fetch contacts:", err);
    return handleRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireClerkUserId();

    const body = await request.json();
    const contact = await upsertContact(userId, body);
    return jsonOk({ contact });
  } catch (err: unknown) {
    console.error("Failed to upsert contact:", err);
    return handleRouteError(err);
  }
}




