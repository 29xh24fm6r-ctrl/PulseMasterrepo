import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * CANONICAL DEV BOOTSTRAP HEALTH
 * - Reports status of dev environment and endpoints
 * - 403 in Production
 */
export async function GET() {
    const isPreview = process.env.VERCEL_ENV === "preview";
    const isDev = process.env.NODE_ENV === "development";

    if (process.env.NODE_ENV === "production" && !isPreview) {
        return NextResponse.json(
            { ok: false, error: "Dev health disabled in production" },
            { status: 403 }
        );
    }
    return NextResponse.json({
        ok: true,
        env: isPreview ? "preview" : isDev ? "development" : process.env.NODE_ENV,
        devEndpointsEnabled: true,
        whoamiOk: true, // Implied if this endpoint is reachable
        bootstrapAllowed: true, // Implied by dev/preview check
        expectedStorageKey: "pulse_owner_user_id",
        timestamp: new Date().toISOString(),
    }, {
        headers: {
            "Cache-Control": "no-store, max-age=0",
        }
    });
}
