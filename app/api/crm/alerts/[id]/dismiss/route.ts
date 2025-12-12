// Dismiss CRM Alert
// app/api/crm/alerts/[id]/dismiss/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { dismissAlert } from "@/lib/crm/alerts";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dismissAlert(userId, params.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to dismiss alert:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}




