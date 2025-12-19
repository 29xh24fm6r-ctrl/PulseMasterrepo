import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDecisionsOverview } from "@/lib/decisions/overview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { ok: false, module: "decisions", summary: "Unauthorized", cards: [] },
        { status: 401 }
      );
    }

    const data = await getDecisionsOverview(userId);
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, module: "decisions", summary: "Failed to load overview.", cards: [], meta: { message } },
      { status: 500 }
    );
  }
}

