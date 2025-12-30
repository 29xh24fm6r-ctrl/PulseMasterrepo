import { NextResponse } from "next/server";

export async function POST(req: Request) {
  return NextResponse.json({
    ok: true,
    session: { id: "mock_session", status: "started" },
  });
}
