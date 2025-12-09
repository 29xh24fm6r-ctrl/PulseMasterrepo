import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "verse",
        instructions: "You are Pulse, a sophisticated AI digital butler. Help users manage their day, tasks, calendar, and goals. Be warm, professional, and concise. Keep responses to 1-3 sentences for voice.",
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: {
          type: "server_vad",
          threshold: 0.4,
          prefix_padding_ms: 300,
          silence_duration_ms: 200,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Voice Session] OpenAI error:", error);
      return NextResponse.json({ error: "Failed to create voice session" }, { status: 500 });
    }

    const data = await response.json();
    console.log("[Voice Session] OpenAI response:", JSON.stringify(data, null, 2));
    return NextResponse.json({
      client_secret: data.client_secret?.value || data.client_secret,
      session_id: data.id,
      expires_at: data.expires_at,
    });
  } catch (error: any) {
    console.error("[Voice Session] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}