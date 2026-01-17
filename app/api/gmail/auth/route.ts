import { NextResponse } from "next/server";
import { isBuildPhase } from "@/lib/env/guard";

export const dynamic = "force-dynamic";

export async function GET() {
  // 🛡️ Build-time safety
  if (isBuildPhase()) {
    return NextResponse.json({ ok: true, buildPhase: true }, { status: 200 });
  }

  const { getGoogleOAuthClient } = await import(
    "@/lib/runtime/google.runtime"
  );

  const oauth = getGoogleOAuthClient();

  return NextResponse.redirect(
    oauth.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      prompt: "consent", // Ensure we get a refresh token
    })
  );
}