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

    // Create response
    const response = NextResponse.json(data);

    // Delete Next.js defaults
    response.headers.delete('cache-control');
    response.headers.delete('pragma');
    response.headers.delete('expires');

    // Set our custom headers
    for (const [key, value] of Object.entries(customHeaders)) {
        response.headers.set(key, value);
    }

    return response;
}
