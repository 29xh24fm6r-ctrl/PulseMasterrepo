import { NextResponse } from "next/server";

export async function GET(req: Request) {
  return NextResponse.json({
    ok: true,
    skills: { stoicism: 5, mindfulness: 10 },
  });
}
