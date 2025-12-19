import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkspaceOverview } from "@/lib/workspace/overview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { ok: false, module: "workspace", summary: "Unauthorized", cards: [] },
        { status: 401 }
      );
    }

    const data = await getWorkspaceOverview(userId);
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, module: "workspace", summary: "Failed to load overview.", cards: [], meta: { message } },
      { status: 500 }
    );
  }
}

