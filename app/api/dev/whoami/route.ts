import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const isPreview = process.env.VERCEL_ENV === "preview";

    if (process.env.NODE_ENV === "production" && !isPreview) {
        return NextResponse.json(
            { ok: false, error: "Dev whoami disabled in production" },
            { status: 403 }
        );
    }

    return NextResponse.json({
        ok: true,
        node_env: process.env.NODE_ENV,
        has_dev_owner_id_env: Boolean(process.env.PULSE_DEV_OWNER_ID),
    });
}
