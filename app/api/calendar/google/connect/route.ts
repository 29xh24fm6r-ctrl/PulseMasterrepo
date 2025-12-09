import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getGoogleAuthUrl } from "@/lib/calendar/googleClient";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const state = Buffer.from(JSON.stringify({ userId })).toString("base64");
    const authUrl = getGoogleAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("[Calendar Connect] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
