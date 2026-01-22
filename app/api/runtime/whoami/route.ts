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

    const cookie = req.headers.get("cookie") ?? "";
    const cookieNames = cookie
        .split(";")
        .map((c) => c.trim().split("=")[0])
        .filter(Boolean)
        .slice(0, 50);

    const host = req.headers.get("host") ?? "unknown";

    const data = {
        ok: true,
        host,
        authed: !!userId,
        userId,
        sessionId,
        cookieNames,
    };

    return new Response(JSON.stringify(data, null, 2), {
        status: 200,
        headers: runtimeHeaders({ authed: !!userId }),
    });
}
