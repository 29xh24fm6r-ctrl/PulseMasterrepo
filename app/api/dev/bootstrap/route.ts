import { NextResponse } from 'next/server';

export async function POST() {
    const devUserId = process.env.NEXT_PUBLIC_DEV_PULSE_OWNER_USER_ID;

    if (!devUserId) {
        return NextResponse.json({ ok: false, error: "missing_env" }, { status: 400 });
    }

    const res = NextResponse.json({ ok: true });

    // Set cookie on the response so the browser stores it immediately
    res.cookies.set("x-pulse-dev-user-id", devUserId, {
        path: "/",
        sameSite: "lax",
        httpOnly: false, // Accessible to client if needed
        secure: true,    // Required for modern browsers/Vercel
    });

    return res;
}
