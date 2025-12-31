import { NextResponse } from "next/server";

export async function GET(req: Request) {
  return NextResponse.json({
    ok: true,
    data: { role: "Product Manager", level: "Senior", next: "Principal" }, // Mock
    message: "Placeholder compatibility route",
  });
}
