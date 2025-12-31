import { NextResponse } from "next/server";

export async function GET(req: Request) {
  return NextResponse.json({
    ok: true,
    streak: { current: 3, best: 7 },
  });
}
