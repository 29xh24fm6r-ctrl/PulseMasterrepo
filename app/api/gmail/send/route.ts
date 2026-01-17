import { NextResponse } from "next/server";
import { google } from "googleapis";

// Constants moved to handler

// Checks moved to handler

export async function POST(req: Request) {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { ok: false, error: "Missing Google OAuth credentials" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { to, subject, message, accessToken } = body;

    if (!to || !subject || !message) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated with Gmail" },
        { status: 401 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Create email content
    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      message,
    ].join("\n");

    // Encode email in base64
    const encodedEmail = Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Send email
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedEmail,
      },
    });

    console.log("✅ Email sent! Message ID:", response.data.id);

    return NextResponse.json({
      ok: true,
      messageId: response.data.id,
    });
  } catch (err: any) {
    console.error("Send email error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to send email",
      },
      { status: 500 }
    );
  }
}
