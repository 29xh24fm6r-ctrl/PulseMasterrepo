import { NextResponse } from "next/server";

export async function POST(req: Request) {
  return NextResponse.json({
    ok: true,
    response: "I am your Career Coach (Mock). Let's discuss your goals.",
  });
}
