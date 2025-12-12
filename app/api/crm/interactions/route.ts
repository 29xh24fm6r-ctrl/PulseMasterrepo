// CRM Interactions API
// app/api/crm/interactions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { logInteraction, getInteractions } from "@/lib/crm/interactions";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const contactId = searchParams.get("contactId") || undefined;
    const dealId = searchParams.get("dealId") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;

    const interactions = await getInteractions(userId, { contactId, dealId, limit });
    return NextResponse.json({ interactions });
  } catch (err: any) {
    console.error("Failed to fetch interactions:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const interaction = await logInteraction(userId, body);
    return NextResponse.json({ interaction });
  } catch (err: any) {
    console.error("Failed to log interaction:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}




