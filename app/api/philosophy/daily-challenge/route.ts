import { NextResponse } from "next/server";

export async function GET(req: Request) {
  return NextResponse.json({
    ok: true,
    challenges: [
      { id: "1", title: "Reflect on Virtue", type: "reflection", completed: false }
    ],
  });
}
