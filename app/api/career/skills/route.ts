import { NextResponse } from "next/server";

export async function GET(req: Request) {
  return NextResponse.json({
    ok: true,
    skills: [
      { name: "Communication", level: 3 },
      { name: "Strategy", level: 2 }
    ],
  });
}
