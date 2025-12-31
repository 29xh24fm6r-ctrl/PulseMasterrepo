import { NextResponse } from "next/server";

export async function GET(req: Request) {
  return NextResponse.json({
    ok: true,
    data: [], // Generic empty list
    message: "Placeholder compatibility route",
  });
}

export async function POST(req: Request) {
  return NextResponse.json({
    ok: true,
    message: "Placeholder compatibility route",
  });
}
