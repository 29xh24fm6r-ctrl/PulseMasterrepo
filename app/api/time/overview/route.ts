import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTimeOverview } from "@/lib/time/overview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { ok: false, module: "time", summary: "Unauthorized", cards: [] },
        { status: 401 }
      );
    }

    const data = await getTimeOverview(userId);
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, module: "time", summary: "Failed to load overview.", cards: [], meta: { message } },
      { status: 500 }
    );
  }
}

