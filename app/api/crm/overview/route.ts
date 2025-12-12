// CRM Overview API
// app/api/crm/overview/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContacts } from "@/lib/crm/contacts";
import { getDeals } from "@/lib/crm/deals";
import { getRelationshipRadar } from "@/lib/crm/radar";
import { getCrmAlerts } from "@/lib/crm/alerts";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [contacts, deals, radar, alerts] = await Promise.all([
      getContacts(userId, { limit: 10 }),
      getDeals(userId),
      getRelationshipRadar(userId, 5),
      getCrmAlerts(userId, { limit: 5, dismissed: false }),
    ]);

    const openDeals = deals.filter((d) => !["won", "lost"].includes(d.stage));
    const wonDeals = deals.filter((d) => d.stage === "won");
    const atRiskDeals = openDeals.filter((d) => d.health && d.health.risk_level >= 4);

    const vipContacts = contacts.filter((c) => c.tags.includes("vip"));
    const atRiskRelationships = radar.filter((r) => r.healthScore < 50);

    return NextResponse.json({
      summary: {
        totalContacts: contacts.length,
        vipContacts: vipContacts.length,
        atRiskRelationships: atRiskRelationships.length,
        openDeals: openDeals.length,
        wonDeals: wonDeals.length,
        atRiskDeals: atRiskDeals.length,
      },
      radar: radar.slice(0, 5),
      alerts: alerts.slice(0, 5),
    });
  } catch (err: any) {
    console.error("Failed to fetch CRM overview:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}




