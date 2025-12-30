import { NextResponse } from "next/server";

export async function GET(req: Request) {
  return NextResponse.json({
    ok: true,
    model: { title: "Software Engineer", competencies: ["Coding", "System Design"] },
  });
}
