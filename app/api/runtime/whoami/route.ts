import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
    try {
        const { userId } = getAuth(req);

        const res = NextResponse.json({
            ok: true,
            authed: !!userId,
            userIdPresent: !!userId,
            // safe probe: no PII allowed
        });

        res.headers.set("x-pulse-src", "runtime_whoami");
        res.headers.set("x-pulse-auth", userId ? "present" : "missing");

        return res;
    } catch (err) {
        // Fallback for environment where clerk might fail or throw
        const res = NextResponse.json({
            ok: true,
            authed: false,
            userIdPresent: false,
            error: "Probe failed safe"
        });
        res.headers.set("x-pulse-src", "runtime_whoami_error");
        return res;
    }
}
