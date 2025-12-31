import { NextResponse } from "next/server";

export async function GET(req: Request) {
  return NextResponse.json({
    ok: true,
    achievements: [],
    stats: { unlocked: 0, total: 10 },
  });
}
