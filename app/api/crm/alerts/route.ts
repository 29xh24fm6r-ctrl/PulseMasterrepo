// CRM Alerts API
// app/api/crm/alerts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCrmAlerts, markAlertSeen, dismissAlert } from "@/lib/crm/alerts";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const dismissed = searchParams.get("dismissed") === "false" ? false : undefined;

    const alerts = await getCrmAlerts(userId, { limit, dismissed });
    return NextResponse.json({ alerts });
  } catch (err: any) {
    console.error("Failed to fetch CRM alerts:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}




