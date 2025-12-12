// Mark CRM Alert as Seen
// app/api/crm/alerts/[id]/seen/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { markAlertSeen } from "@/lib/crm/alerts";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await markAlertSeen(userId, params.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to mark alert as seen:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}




