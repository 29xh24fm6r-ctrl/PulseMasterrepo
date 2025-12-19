import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getLoopsOverview } from "@/lib/loops/overview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { ok: false, module: "loops", summary: "Unauthorized", cards: [] },
        { status: 401 }
      );
    }

    const data = await getLoopsOverview(userId);
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, module: "loops", summary: "Failed to load overview.", cards: [], meta: { message } },
      { status: 500 }
    );
  }
}

