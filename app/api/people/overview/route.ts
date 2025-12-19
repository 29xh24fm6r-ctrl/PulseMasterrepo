import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPeopleOverview } from "@/lib/people/overview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { ok: false, module: "people", summary: "Unauthorized", cards: [] },
        { status: 401 }
      );
    }

    const data = await getPeopleOverview(userId);
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, module: "people", summary: "Failed to load overview.", cards: [], meta: { message } },
      { status: 500 }
    );
  }
}

