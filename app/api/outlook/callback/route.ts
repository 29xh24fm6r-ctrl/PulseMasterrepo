import { NextRequest, NextResponse } from "next/server";

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID!;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET!;
const MICROSOFT_REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI!;

const SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "User.Read",
  "Mail.Read",
  "Mail.Send",
  "Calendars.Read",
  "Contacts.Read",
].join(" ");

// Store tokens in memory (in production, use a database)
let outlookTokens: {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user_email?: string;
  user_name?: string;
} | null = null;

// ============================================
// GET: Handle OAuth callback & status check
// ============================================
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const action = searchParams.get("action");
  const error = searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    console.error("OAuth error:", error, searchParams.get("error_description"));
    const baseUrl = MICROSOFT_REDIRECT_URI.replace("/api/outlook/callback", "");
    return NextResponse.redirect(`${baseUrl}/settings?outlook_error=${error}`);
  }

  // OAuth callback - exchange code for tokens
  if (code) {
    try {
      console.log("🔐 Exchanging code for Outlook tokens...");
      
      const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: MICROSOFT_CLIENT_ID,
          client_secret: MICROSOFT_CLIENT_SECRET,
          code: code,
          redirect_uri: MICROSOFT_REDIRECT_URI,
          grant_type: "authorization_code",
          scope: SCOPES,
        }),
      });

      const tokens = await tokenResponse.json();

      if (tokens.error) {
        console.error("Token error:", tokens);
        throw new Error(tokens.error_description || tokens.error);
      }

      // Get user info
      const userResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });
      const user = await userResponse.json();

      // Store tokens
      outlookTokens = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: Date.now() + tokens.expires_in * 1000,
        user_email: user.mail || user.userPrincipalName,
        user_name: user.displayName,
      };

      console.log(`✅ Outlook connected for: ${outlookTokens.user_email}`);

      // Redirect to settings page
      const baseUrl = MICROSOFT_REDIRECT_URI.replace("/api/outlook/callback", "");
      return NextResponse.redirect(`${baseUrl}/settings?outlook_connected=true`);
      
    } catch (err: any) {
      console.error("OAuth error:", err);
      const baseUrl = MICROSOFT_REDIRECT_URI.replace("/api/outlook/callback", "");
      return NextResponse.redirect(`${baseUrl}/settings?outlook_error=${encodeURIComponent(err.message)}`);
    }
  }

  // Check connection status
  if (action === "status") {
    if (outlookTokens && outlookTokens.expires_at > Date.now()) {
      return NextResponse.json({
        connected: true,
        email: outlookTokens.user_email,
        name: outlookTokens.user_name,
      });
    }
    return NextResponse.json({ connected: false });
  }

  // Get auth URL
  if (action === "auth-url") {
    const authUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
    authUrl.searchParams.set("client_id", MICROSOFT_CLIENT_ID);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", MICROSOFT_REDIRECT_URI);
    authUrl.searchParams.set("scope", SCOPES);
    authUrl.searchParams.set("response_mode", "query");
    authUrl.searchParams.set("prompt", "consent");
    
    return NextResponse.json({ url: authUrl.toString() });
  }

  // Disconnect
  if (action === "disconnect") {
    outlookTokens = null;
    return NextResponse.json({ ok: true, message: "Outlook disconnected" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// ============================================
// POST: Outlook API actions
// ============================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // Check if connected
    if (!outlookTokens) {
      return NextResponse.json({ ok: false, error: "Outlook not connected" }, { status: 401 });
    }

    // Refresh token if needed
    if (outlookTokens.expires_at < Date.now() + 60000) {
      await refreshAccessToken();
    }

    const headers = {
      Authorization: `Bearer ${outlookTokens.access_token}`,
      "Content-Type": "application/json",
    };

    // ============================================
    // Fetch Emails
    // ============================================
    if (action === "fetch-emails") {
      const { folder = "inbox", count = 20 } = body;
      
      console.log(`📧 Fetching ${count} emails from Outlook ${folder}...`);
      
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/mailFolders/${folder}/messages?$top=${count}&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,bodyPreview,isRead,importance`,
        { headers }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to fetch emails");
      }

      const data = await response.json();
      
      const emails = data.value.map((email: any) => ({
        id: email.id,
        subject: email.subject,
        from: email.from?.emailAddress?.address,
        fromName: email.from?.emailAddress?.name,
        date: email.receivedDateTime,
        preview: email.bodyPreview,
        isRead: email.isRead,
        importance: email.importance,
      }));

      console.log(`✅ Fetched ${emails.length} emails from Outlook`);
      
      return NextResponse.json({ ok: true, emails });
    }

    // ============================================
    // Fetch Single Email
    // ============================================
    if (action === "fetch-email") {
      const { emailId } = body;
      
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages/${emailId}?$select=id,subject,from,toRecipients,receivedDateTime,body,isRead,importance`,
        { headers }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to fetch email");
      }

      const email = await response.json();
      
      return NextResponse.json({
        ok: true,
        email: {
          id: email.id,
          subject: email.subject,
          from: email.from?.emailAddress?.address,
          fromName: email.from?.emailAddress?.name,
          to: email.toRecipients?.map((r: any) => r.emailAddress?.address),
          date: email.receivedDateTime,
          body: email.body?.content,
          bodyType: email.body?.contentType,
          isRead: email.isRead,
          importance: email.importance,
        },
      });
    }

    // ============================================
    // Send Email
    // ============================================
    if (action === "send-email") {
      const { to, subject, body: emailBody, isHtml = false } = body;
      
      console.log(`📤 Sending email to ${to}...`);
      
      const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: {
            subject,
            body: {
              contentType: isHtml ? "HTML" : "Text",
              content: emailBody,
            },
            toRecipients: [
              {
                emailAddress: { address: to },
              },
            ],
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to send email");
      }

      console.log(`✅ Email sent to ${to}`);
      
      return NextResponse.json({ ok: true, message: "Email sent" });
    }

    // ============================================
    // Fetch Calendar Events
    // ============================================
    if (action === "fetch-calendar") {
      const { days = 7 } = body;
      
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      
      console.log(`📅 Fetching calendar events for next ${days} days...`);
      
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${startDate}&endDateTime=${endDate}&$orderby=start/dateTime&$select=id,subject,start,end,organizer,attendees,location,bodyPreview`,
        { headers }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to fetch calendar");
      }

      const data = await response.json();
      
      const events = data.value.map((event: any) => ({
        id: event.id,
        subject: event.subject,
        start: event.start?.dateTime,
        end: event.end?.dateTime,
        organizer: event.organizer?.emailAddress?.name,
        attendees: event.attendees?.map((a: any) => ({
          name: a.emailAddress?.name,
          email: a.emailAddress?.address,
          status: a.status?.response,
        })),
        location: event.location?.displayName,
        preview: event.bodyPreview,
      }));

      console.log(`✅ Fetched ${events.length} calendar events`);
      
      return NextResponse.json({ ok: true, events });
    }

    // ============================================
    // Fetch Contacts
    // ============================================
    if (action === "fetch-contacts") {
      const { count = 50 } = body;
      
      console.log(`👥 Fetching ${count} contacts from Outlook...`);
      
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/contacts?$top=${count}&$select=id,displayName,emailAddresses,businessPhones,companyName,jobTitle`,
        { headers }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to fetch contacts");
      }

      const data = await response.json();
      
      const contacts = data.value.map((contact: any) => ({
        id: contact.id,
        name: contact.displayName,
        email: contact.emailAddresses?.[0]?.address,
        phone: contact.businessPhones?.[0],
        company: contact.companyName,
        role: contact.jobTitle,
      }));

      console.log(`✅ Fetched ${contacts.length} contacts`);
      
      return NextResponse.json({ ok: true, contacts });
    }

    // ============================================
    // Scan Emails for Actions (like Gmail scanner)
    // ============================================
    if (action === "scan-emails") {
      const { count = 20 } = body;
      
      console.log(`🔍 Scanning ${count} Outlook emails for actions...`);
      
      // Fetch recent emails
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=${count}&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,bodyPreview,body`,
        { headers }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to fetch emails");
      }

      const data = await response.json();
      
      // Return emails for AI processing
      const emails = data.value.map((email: any) => ({
        id: email.id,
        subject: email.subject,
        from: email.from?.emailAddress?.address,
        fromName: email.from?.emailAddress?.name,
        date: email.receivedDateTime,
        preview: email.bodyPreview,
        body: email.body?.content,
      }));

      console.log(`✅ Scanned ${emails.length} emails for processing`);
      
      return NextResponse.json({ ok: true, emails });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    
  } catch (err: any) {
    console.error("❌ Outlook API error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// ============================================
// Refresh Access Token
// ============================================
async function refreshAccessToken() {
  if (!outlookTokens?.refresh_token) {
    throw new Error("No refresh token available");
  }

  console.log("🔄 Refreshing Outlook access token...");

  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      client_secret: MICROSOFT_CLIENT_SECRET,
      refresh_token: outlookTokens.refresh_token,
      grant_type: "refresh_token",
      scope: SCOPES,
    }),
  });

  const tokens = await response.json();

  if (tokens.error) {
    outlookTokens = null;
    throw new Error(tokens.error_description || "Failed to refresh token");
  }

  outlookTokens = {
    ...outlookTokens,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || outlookTokens.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
  };

  console.log("✅ Token refreshed");
}