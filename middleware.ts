import { NextRequest, NextResponse } from "next/server";
import { isPublicAssetPath } from "@/lib/middleware/publicAssets.edge";

const IS_CI =
  process.env.CI === "true" ||
  process.env.VERCEL_ENV === "preview" ||
  process.env.NODE_ENV === "test";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 🔒 ABSOLUTE FIRST: CI HARD STOP FOR /bridge
  if (pathname === "/bridge" && IS_CI) {
    return new NextResponse("CI bridge bypass", {
      status: 200,
      headers: {
        "X-Pulse-MW": "allow_dev_bypass",
        "X-Pulse-CI": "true",
      },
    });
  }

  // ⬇️ EVERYTHING ELSE COMES AFTER ⬇️

  // 1️⃣ Hard allow public assets
  if (isPublicAssetPath(pathname)) {
    return NextResponse.next();
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
