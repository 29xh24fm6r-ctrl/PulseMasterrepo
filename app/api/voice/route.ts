import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/services/ai/openai";
import { toFile } from "openai/uploads";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const action = String(formData.get("action") ?? "");

    const openai = getOpenAI();

    // Speech-to-Text (Whisper)
    if (action === "transcribe") {
      const audioBlob = formData.get("audio") as Blob | null;
      if (!audioBlob) {
        return NextResponse.json({ error: "No audio provided" }, { status: 400 });
      }

      const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
      const audioFile = await toFile(audioBuffer, "audio.webm", { type: "audio/webm" });

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "en",
      });

      return NextResponse.json({ success: true, text: transcription.text });
    }

    // Text-to-Speech
    if (action === "speak") {
      const text = String(formData.get("text") ?? "");
      if (!text) {
        return NextResponse.json({ error: "No text provided" }, { status: 400 });
      }

      const mp3Response = await openai.audio.speech.create({
        model: "tts-1",
        voice: "nova",
        input: text,
        speed: 1.0,
      });

      const audioBuffer = Buffer.from(await mp3Response.arrayBuffer());
      return new NextResponse(audioBuffer, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": String(audioBuffer.length),
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Voice API error:", error);
    return NextResponse.json(
      { error: "Voice processing failed", details: String(error) },
      { status: 500 }
    );
  }
}