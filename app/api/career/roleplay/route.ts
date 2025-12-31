import { NextResponse } from "next/server";

export async function GET(req: Request) {
  return NextResponse.json({
    ok: true,
    scenarios: ["Negotiation", "Feedback", "Conflict Resolution"],
  });
}

export async function POST(req: Request) {
  return NextResponse.json({
    ok: true,
    feedback: "Good attempt. Try to be more assertive.",
  });
}
