import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy the current request to another internal API path.
 * Keeps querystring and method, and forwards body for non-GET/HEAD.
 */
export async function proxyTo(req: NextRequest, targetPath: string) {
    const url = new URL(req.url);
    const target = new URL(targetPath, url.origin);
    target.search = url.search;

    const method = req.method.toUpperCase();

    const init: RequestInit = {
        method,
        headers: new Headers(req.headers),
    };

    // Body forwarding for non-GET/HEAD
    if (method !== "GET" && method !== "HEAD") {
        const buf = await req.arrayBuffer();
        init.body = buf.byteLength ? Buffer.from(buf) : undefined;
    }

    // Avoid infinite loops
    init.headers.delete("host");

    const res = await fetch(target.toString(), init);
    const data = await res.arrayBuffer();

    const out = new NextResponse(data, { status: res.status });

    // Copy content-type and other safe headers
    const ct = res.headers.get("content-type");
    if (ct) out.headers.set("content-type", ct);

    return out;
}

export function methodNotAllowed(allowed: string[]) {
    return NextResponse.json(
        { ok: false, error: "Method Not Allowed", allowed },
        { status: 405 }
    );
}
