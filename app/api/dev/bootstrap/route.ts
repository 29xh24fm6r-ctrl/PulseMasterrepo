import { NextResponse } from "next/server";

/**
 * CANONICAL DEV BOOTSTRAP
 * - NO Clerk
 * - NO middleware auth
 * - NO Supabase
 * - Deterministic dev owner id
 *
 * NOTE:
 * - Enabled for non-production only
 * - Used to set pulse_owner_user_id in localStorage on Preview/Dev
 */

export async function POST() {
    // Absolute safety: never allow in prod
    // Absolute safety: never allow in prod UNLESS it is an explicit Preview deployment
    const isPreview = process.env.VERCEL_ENV === "preview";
    if (process.env.NODE_ENV === "production" && !isPreview) {
        return NextResponse.json(
            { ok: false, error: "Dev bootstrap disabled in production" },
            { status: 403 }
        );
    }

    const ownerUserId =
        process.env.PULSE_DEV_OWNER_ID ?? "00000000-0000-0000-0000-000000000001";

    return NextResponse.json({
        ok: true,
        pulse_owner_user_id: ownerUserId,
        source: "dev-bootstrap",
    });
}
