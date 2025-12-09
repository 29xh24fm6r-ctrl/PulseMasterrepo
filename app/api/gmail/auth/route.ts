import { NextResponse } from "next/server";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!GOOGLE_CLIENT_ID) {
  throw new Error("GOOGLE_CLIENT_ID is not set");
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    clientId: GOOGLE_CLIENT_ID,
  });
}