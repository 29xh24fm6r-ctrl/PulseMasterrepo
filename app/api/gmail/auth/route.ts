import { NextResponse } from "next/server";

// Moved to handler to prevent build-time error

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not set");
  }
  return NextResponse.json({
    ok: true,
    clientId,
  });
}