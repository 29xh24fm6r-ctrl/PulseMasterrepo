import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/voice/sdp
 *
 * Server-side SDP proxy for OpenAI Realtime WebRTC.
 * The browser sends its SDP offer + ephemeral token here;
 * we forward to OpenAI and return the SDP answer.
 *
 * This keeps api.openai.com out of the browser's connect-src
 * so CSP stays locked to first-party origins only.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { token, sdp } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid token" },
        { status: 400 }
      );
    }

    if (!sdp || typeof sdp !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid SDP offer" },
        { status: 400 }
      );
    }

    // Proxy the SDP exchange to OpenAI Realtime
    const sdpRes = await fetch(
      "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/sdp",
        },
        body: sdp,
        cache: "no-store",
      }
    );

    if (!sdpRes.ok) {
      const errText = await sdpRes.text().catch(() => "");
      console.error("[voice/sdp] OpenAI SDP exchange failed", {
        status: sdpRes.status,
        body: errText ? errText.slice(0, 300) : "",
      });
      return NextResponse.json(
        { error: "SDP exchange failed" },
        { status: 502 }
      );
    }

    const answerSdp = await sdpRes.text();

    return new NextResponse(answerSdp, {
      status: 200,
      headers: {
        "Content-Type": "application/sdp",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("[voice/sdp] Handler error", {
      message: error?.message || "unknown_error",
    });
    return NextResponse.json(
      { error: error?.message || "SDP proxy error" },
      { status: 500 }
    );
  }
}
