import { NextResponse } from "next/server";

export async function GET(req: Request) {
  return NextResponse.json({
    ok: true,
    data: "Deep dive analysis coming soon.",
  });
}
