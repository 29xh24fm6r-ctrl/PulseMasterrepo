import { NextRequest, NextResponse } from "next/server";
import { isPublicAssetPath } from "@/lib/middleware/publicAssets.edge";

function isCIEnv() {
  // Edge-safe env access
  return (
    process.env.CI === "true" ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.NODE_ENV === "test"
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1️⃣ Hard allow public assets
  if (isPublicAssetPath(pathname)) {
    return NextResponse.next();
  }

  // 2️⃣ CI / Preview bridge bypass
  if (
    isCIEnv() &&
    (pathname === "/bridge" || pathname.startsWith("/bridge/"))
  ) {
    const res = NextResponse.next();
    res.headers.set("X-Pulse-MW", "allow_dev_bypass");
    return res;
  }

  // 3️⃣ Default safe pass-through
  const res = NextResponse.next();
  res.headers.set("X-Pulse-MW", "allow_auth");
  return res;
}

export const config = {
  matcher: [
    "/bridge/:path*",
    "/((?!_next/static|_next/image).*)",
  ],
};
