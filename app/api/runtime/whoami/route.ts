import { auth } from "@clerk/nextjs/server";
import { runtimeHeaders } from "@/lib/runtime/runtimeHeaders";

export const dynamic = "force-dynamic";

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

    // Diagnostics should ideally be 'unknown' or 'present' depending on if we think we found a user
    // The spec said: "/api/runtime/whoami -> auth: 'unknown'"
    const headers = runtimeHeaders({ auth: "unknown" });

    const cookieNames = (cookie ?? "")

    const data = {
        ok: true,
        host,
        authed: !!userId,
        userId,
        sessionId,
        cookieNames,
    };

    return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            ...headers,
        },
    });
}
