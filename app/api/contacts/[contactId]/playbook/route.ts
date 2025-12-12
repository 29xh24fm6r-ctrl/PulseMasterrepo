// Contact Playbook API
// app/api/contacts/[contactId]/playbook/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContactPlaybook } from "@/lib/contacts/playbook";

export async function GET(
  req: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contactId = params.contactId;
    const searchParams = req.nextUrl.searchParams;
    const forceRegenerate = searchParams.get("regenerate") === "true";

    const playbook = await getContactPlaybook({
      userId,
      contactId,
      forceRegenerate,
    });

    return NextResponse.json(playbook);
  } catch (err: any) {
    console.error("[ContactPlaybook] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get contact playbook" },
      { status: 500 }
    );
  }
}

