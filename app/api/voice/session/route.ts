import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonNoCache(body: any, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return jsonNoCache({ error: "Unauthorized" }, { status: 401 });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
    if (!OPENAI_API_KEY) {
      return jsonNoCache(
        { error: "Voice is not configured: missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "verse",
        instructions:
          "You are Pulse, a sophisticated AI digital butler. Help users manage their day, tasks, calendar, and goals. Be warm, professional, and concise. Keep responses to 1-3 sentences for voice.",
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: {
          type: "server_vad",
          threshold: 0.4,
          prefix_padding_ms: 300,
          silence_duration_ms: 200,
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("[voice/session] OpenAI session create failed", {
        status: response.status,
        body: errText ? errText.slice(0, 300) : "",
      });

      return jsonNoCache(
        { error: "Failed to create voice session" },
        { status: 500 }
      );
    }

    const data: any = await response.json();

    // NEVER log the full response (contains client_secret)
    console.log("[voice/session] session created", {
      id: data?.id,
      expires_at: data?.expires_at,
      model: data?.model,
    });

    const clientSecret = data?.client_secret?.value ?? data?.client_secret;

    if (!clientSecret) {
      console.error("[voice/session] Missing client_secret in OpenAI response", {
        id: data?.id,
      });
      return jsonNoCache(
        { error: "Voice session missing client secret" },
        { status: 500 }
      );
    }

    return jsonNoCache({
      client_secret: { value: clientSecret },
      session_id: data?.id,
      expires_at: data?.expires_at,
    });
  } catch (error: any) {
    console.error("[voice/session] Handler error", {
      message: error?.message || "unknown_error",
    });
    return jsonNoCache(
      { error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
