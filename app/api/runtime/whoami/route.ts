import { runtimeHeaders } from "@/lib/runtime/runtimeHeaders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
    if (process.env.NEXT_PHASE === "phase-production-build") {
        return new Response(
            JSON.stringify({ ok: true, authed: false, build: true }),
            {
                status: 200,
                headers: runtimeHeaders({ authed: false }),
            }
        );
    }

    let userId: string | null = null;

    try {
        const clerk = await import("@clerk/nextjs/server");
        userId = clerk.auth()?.userId ?? null;
    } catch { }

    return new Response(
        JSON.stringify({
            ok: true,
            authed: Boolean(userId),
            userId,
        }),
        {
            status: 200,
            headers: runtimeHeaders({ authed: Boolean(userId) }),
        }
    );
}
