import { google } from "googleapis";
import { googleOAuthClient } from "@/lib/email/googleOAuth";

export async function gmailForAccount(account: {
  access_token: string | null;
  refresh_token: string | null;
  token_expiry: string | null;
}) {
  const oauth2 = googleOAuthClient();
  oauth2.setCredentials({
    access_token: account.access_token ?? undefined,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date: account.token_expiry ? new Date(account.token_expiry).getTime() : undefined,
  });

  // If access_token expired, googleapis will refresh if refresh_token exists.
  const gmail = google.gmail({ version: "v1", auth: oauth2 });
  return { gmail, oauth2 };
}

