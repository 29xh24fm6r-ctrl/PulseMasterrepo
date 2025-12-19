import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBrainOverview } from "@/lib/brain/overview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { ok: false, module: "brain", summary: "Unauthorized", cards: [] },
        { status: 401 }
      );
    }

    const data = await getBrainOverview(userId);
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, module: "brain", summary: "Failed to load overview.", cards: [], meta: { message } },
      { status: 500 }
    );
  }
}

