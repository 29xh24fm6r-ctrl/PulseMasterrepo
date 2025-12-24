import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { googleOAuthClient, GOOGLE_SCOPES } from "@/lib/email/googleOAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const oauth2 = googleOAuthClient();

  // NOTE: stateless flow for simplicity. If you want CSRF-hardening, we can add a signed state.
  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    include_granted_scopes: true,
  });

  return NextResponse.redirect(url);
}

