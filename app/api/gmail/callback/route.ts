import { NextRequest, NextResponse } from "next/server";
import { isBuildPhase } from "@/lib/env/guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // 🛡️ Build-time safety
  if (isBuildPhase()) {
    return NextResponse.json({ ok: true, buildPhase: true }, { status: 200 });
  }

  console.log("🎯 CALLBACK HIT!");

  try {
    const { getGoogleOAuthClient } = await import("@/lib/runtime/google.runtime");
    // Use singleton for code exchange (stateless op on client)
    const oauth2Client = getGoogleOAuthClient();

    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    console.log("Code:", code ? "Present" : "Missing");
    console.log("Error:", error || "None");

    if (error) {
      console.error("OAuth error:", error);
      return NextResponse.redirect(
        new URL(`/follow-ups?error=${error}`, req.url)
      );
    }

    if (!code) {
      console.error("No code provided");
      return NextResponse.redirect(
        new URL("/follow-ups?error=no_code", req.url)
      );
    }

    console.log("🔑 Exchanging code for tokens...");
    const { tokens } = await oauth2Client.getToken(code);

    console.log("✅ Tokens received!");
    console.log("Access token:", tokens.access_token ? "Yes" : "No");
    console.log("Refresh token:", tokens.refresh_token ? "Yes" : "No");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Gmail Connected</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 3rem;
      background: rgba(30, 41, 59, 0.5);
      border-radius: 1rem;
      border: 1px solid rgba(100, 116, 139, 0.3);
    }
    .icon {
      font-size: 5rem;
      margin-bottom: 1.5rem;
      animation: bounce 2s infinite;
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
      background: linear-gradient(to right, #3b82f6, #06b6d4);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      color: #94a3b8;
      margin-bottom: 2rem;
      font-size: 1.1rem;
    }
    .spinner {
      border: 4px solid #334155;
      border-top: 4px solid #3b82f6;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✅</div>
    <h1>Gmail Connected!</h1>
    <p>Saving credentials and redirecting...</p>
    <div class="spinner"></div>
  </div>
  <script>
    console.log('💾 Saving tokens to localStorage...');
    
    try {
      localStorage.setItem('gmail_access_token', '${tokens.access_token}');
      localStorage.setItem('gmail_refresh_token', '${tokens.refresh_token}');
      console.log('✅ Tokens saved successfully!');
      
      setTimeout(() => {
        console.log('🔄 Redirecting to Follow-Ups page...');
        window.location.href = '/follow-ups?gmail_connected=true';
      }, 2000);
    } catch (err) {
      console.error('❌ Failed to save tokens:', err);
      alert('Failed to save Gmail credentials. Please try again.');
    }
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });

  } catch (err: any) {
    console.error("❌ Callback error:", err);
    console.error("Error message:", err.message);

    return NextResponse.redirect(
      new URL(`/follow-ups?error=auth_failed&details=${encodeURIComponent(err.message)}`, req.url)
    );
  }
}