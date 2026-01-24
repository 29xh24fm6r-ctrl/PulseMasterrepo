import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { runtimeHeaders } from "@/lib/runtime/runtimeHeaders";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
    let userId: string | null = null;
    let sessionId: string | null = null;

    try {
        const a = auth();
        userId = a.userId ?? null;
        sessionId = a.sessionId ?? null;
    } catch {
        // swallow: diagnostics must not crash
    }

    const host = req.headers.get("host") ?? "unknown";
    const cookie = req.headers.get("cookie");

    if (!cookie) {
        console.warn(`[whoami] No cookies received by server (Host: ${host})`);
    }

    const cookieNames = (cookie ?? "")

    const data = {
        ok: true,
        host,
        authed: !!userId,
        userId,
        sessionId,
        cookieNames,
    };

    // Get custom headers
    const customHeaders = runtimeHeaders({ authed: !!userId });

    // Create response first
    const response = NextResponse.json(data, { status: 200 });

    // Set headers explicitly to override defaults
    Object.entries(customHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    return response;
}
