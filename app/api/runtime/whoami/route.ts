```typescript
import { NextRequest, NextResponse } from "next/server";
import { applyNoStoreHeaders } from "@/lib/runtime/httpNoStore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        // Zero Build-Time SDK: Dynamic import to prevent build crashes
        const { getAuth } = await import("@clerk/nextjs/server");
        const { userId } = getAuth(req);
        
        const env = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
        
        const res = NextResponse.json({
            ok: true,
            authed: !!userId,
            userIdPresent: !!userId,
            env,
            build: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev",
        });

        res.headers.set("x-pulse-src", "runtime_whoami");
        res.headers.set("x-pulse-auth", userId ? "present" : "missing");
        res.headers.set("x-pulse-env", env);

        return applyNoStoreHeaders(res);
    } catch (err) {
        // Fallback for environment where clerk might fail or throw
        const res = NextResponse.json({
            ok: true,
            authed: false,
            userIdPresent: false,
            error: "Probe failed safe", 
            env: "unknown"
        });
        res.headers.set("x-pulse-src", "runtime_whoami_error");
        return applyNoStoreHeaders(res);
    }
}
```
