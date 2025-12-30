import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    return NextResponse.json({
        ok: true,
        ts: new Date().toISOString(),
        release: process.env.NEXT_PUBLIC_PULSE_RELEASE ?? "unknown",
        env: process.env.NODE_ENV ?? "unknown",
    });
}
