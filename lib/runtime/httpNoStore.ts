import { NextResponse } from "next/server";

/**
 * Enforces strict no-cache / no-store headers for runtime APIs.
 * This ensures that neither the browser, any proxy, nor the Edge cache
 * retains the response. Crucial for sensitive runtime/auth states.
 */
export function applyNoStoreHeaders(res: NextResponse) {
    res.headers.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0"
    );
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    res.headers.set("Surrogate-Control", "no-store");
    res.headers.set("Vary", "Authorization, Cookie");

    return res;
}
