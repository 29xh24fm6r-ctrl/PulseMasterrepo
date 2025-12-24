import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { google } from "googleapis";
import { googleOAuthClient } from "@/lib/email/googleOAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.json({ ok: false, error: "missing_code" }, { status: 400 });

  const sb = supabaseAdmin();
  const oauth2 = googleOAuthClient();

  const { tokens } = await oauth2.getToken(code);
  oauth2.setCredentials(tokens);

  // Get the connected email address
  const oauth2Api = google.oauth2({ version: "v2", auth: oauth2 });
  const me = await oauth2Api.userinfo.get();
  const email = String(me.data.email || "").trim();
  if (!email) return NextResponse.json({ ok: false, error: "email_lookup_failed" }, { status: 500 });

  const accessToken = tokens.access_token ?? null;
  const refreshToken = tokens.refresh_token ?? null;
  const expiry = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null;

  // Upsert account
  const { error } = await sb.from("email_accounts").upsert(
    {
      user_id: userId,
      provider: "google",
      email_address: email,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expiry: expiry,
      status: "connected",
      last_error: null,
      last_sync_at: null,
      gmail_history_id: null,
    },
    { onConflict: "user_id,provider,email_address" }
  );

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Send them back to inbox
  return NextResponse.redirect(new URL("/email/inbox", url.origin));
}

