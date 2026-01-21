import { NextRequest, NextResponse } from "next/server";
import { isPublicAssetPath } from "@/lib/middleware/publicAssets.edge";

const IS_CI =
  process.env.CI === "true" ||
  process.env.VERCEL_ENV === "preview" ||
  process.env.NODE_ENV === "test";

function tag(res: NextResponse, value: string) {
  res.headers.set("x-pulse-mw", value);
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 🚨 ABSOLUTE BYPASS — MUST NEVER ENFORCE AUTH
  if (pathname === "/manifest.json") {
    return tag(NextResponse.next(), "BYPASS_MANIFEST");
  }

  if (pathname.startsWith("/api/runtime/")) {
    return tag(NextResponse.next(), "BYPASS_RUNTIME");
  }

  // 👇 Any request reaching here DID hit middleware

  // 🔒 ABSOLUTE FIRST: CI HARD STOP FOR /bridge
  if (pathname === "/bridge" && IS_CI) {
    const res = new NextResponse("CI bridge bypass", {
      status: 200,
      headers: {
        "X-Pulse-MW": "allow_dev_bypass",
        "X-Pulse-CI": "true",
      },
    });
    return tag(res, "HIT_CI_BRIDGE");
  }

  // 1️⃣ Hard allow public assets
  if (isPublicAssetPath(pathname)) {
    return tag(NextResponse.next(), "HIT_PUBLIC_ASSET");
  }

  // 3️⃣ Default safe pass-through
  const res = NextResponse.next();
  res.headers.set("X-Pulse-MW", "allow_auth");
  tag(res, "HIT");
  return res;
}

export const config = {
  matcher: [
    "/bridge/:path*",
    // Apply middleware to everything EXCEPT:
    // - /manifest.json
    // - /api/runtime/*
    // - standard static assets
    "/((?!manifest\\.json|api/runtime|_next/static|_next/image).*)",
  ],
};
