import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { gmailForAccount } from "@/lib/email/gmailClient";
import { ingestInboundEmail } from "@/lib/email/inboundPipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function headerVal(headers: any[] | undefined, name: string) {
  const h = (headers || []).find((x) => String(x?.name || "").toLowerCase() === name.toLowerCase());
  return h?.value ? String(h.value) : "";
}

export async function POST(req: Request) {
  const cronSecret = process.env.EMAIL_CRON_SECRET;
  if (cronSecret) {
    const got = req.headers.get("x-pulse-cron-secret");
    if (got !== cronSecret) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const url = new URL(req.url);
  const limit = clamp(Number(url.searchParams.get("limit") || 25), 1, 100);
  const minutes = clamp(Number(url.searchParams.get("minutes") || 60), 5, 24 * 60);

  const sb = supabaseAdmin();

  const { data: accounts, error: aErr } = await sb
    .from("email_accounts")
    .select("*")
    .eq("provider", "google")
    .eq("status", "connected");

  if (aErr) return NextResponse.json({ ok: false, error: aErr.message }, { status: 500 });

  const results: any[] = [];

  for (const acc of accounts ?? []) {
    try {
      const { gmail, oauth2 } = await gmailForAccount({
        access_token: acc.access_token,
        refresh_token: acc.refresh_token,
        token_expiry: acc.token_expiry,
      });

      // Update tokens if refreshed
      const creds = oauth2.credentials;
      if (creds.access_token || creds.expiry_date) {
        await sb
          .from("email_accounts")
          .update({
            access_token: creds.access_token ?? acc.access_token,
            token_expiry: creds.expiry_date ? new Date(creds.expiry_date).toISOString() : acc.token_expiry,
            // refresh_token is usually only returned on first consent
          })
          .eq("id", acc.id)
          .catch(() => {});
      }

      // Query: last X minutes (simple + reliable)
      const q = `newer_than:${minutes}m`;
      const list = await gmail.users.messages.list({
        userId: "me",
        q,
        maxResults: limit,
        labelIds: ["INBOX"],
      });

      const msgs = list.data.messages || [];
      let ingested = 0;

      for (const m of msgs) {
        if (!m.id) continue;

        const full = await gmail.users.messages.get({
          userId: "me",
          id: m.id,
          format: "metadata",
          metadataHeaders: ["Message-Id", "From", "To", "Subject", "Date"],
        });

        const payload = full.data.payload;
        const headers = payload?.headers || [];

        const messageId = headerVal(headers, "Message-Id") || String(full.data.id);
        const from = headerVal(headers, "From");
        const to = headerVal(headers, "To");
        const subject = headerVal(headers, "Subject") || "(no subject)";
        const date = headerVal(headers, "Date");
        const receivedAt = date ? new Date(date).toISOString() : new Date().toISOString();

        const snippet = String(full.data.snippet || "").trim();

        // Extract thread headers
        const inReplyTo = headerVal(headers, "In-Reply-To");
        const references = headerVal(headers, "References");
        const referencesArray = references ? references.split(/\s+/).filter(Boolean) : null;

        await ingestInboundEmail({
          user_id: String(acc.user_id),
          message_id: messageId,
          thread_id: full.data.threadId ?? null,
          from_email: from,
          to_email: to,
          subject,
          snippet,
          received_at: receivedAt,
          in_reply_to: inReplyTo || null,
          references: referencesArray,
        });

        ingested++;
      }

      await sb
        .from("email_accounts")
        .update({ last_sync_at: new Date().toISOString(), last_error: null })
        .eq("id", acc.id)
        .catch(() => {});

      results.push({ account: acc.email_address, ok: true, fetched: msgs.length, ingested });
    } catch (e: any) {
      await sb
        .from("email_accounts")
        .update({ status: "error", last_error: e?.message || "sync_failed" })
        .eq("id", acc.id)
        .catch(() => {});
      results.push({ account: acc.email_address, ok: false, error: e?.message || "sync_failed" });
    }
  }

  return NextResponse.json({ ok: true, accounts: results.length, results });
}

