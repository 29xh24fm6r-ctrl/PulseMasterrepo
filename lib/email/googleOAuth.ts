import { google } from "googleapis";

export function googleOAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET!;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI!;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("missing_google_oauth_env");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
];

