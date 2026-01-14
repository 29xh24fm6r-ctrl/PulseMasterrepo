import { NextResponse } from "next/server";
import { runChefGoTimeScan } from "@/lib/chef/notifications/goTimeScan";

export const runtime = "nodejs";

export async function POST() {
    const res = await runChefGoTimeScan({});
    return NextResponse.json({ ok: true, ...res });
}
