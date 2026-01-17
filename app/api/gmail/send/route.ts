import { NextResponse } from "next/server";
import { google } from "googleapis";
import { isBuildPhase } from "@/lib/env/guard";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // 🛡️ Build-time safety
  if (isBuildPhase()) {
    return NextResponse.json({ ok: true, buildPhase: true }, { status: 200 });
  }

  try {
    const { createGoogleOAuthClient } = await import("@/lib/runtime/google.runtime");

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

    // Use FACTORY method to get a fresh client instance since we set credentials
    const oauth2Client = createGoogleOAuthClient();

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
