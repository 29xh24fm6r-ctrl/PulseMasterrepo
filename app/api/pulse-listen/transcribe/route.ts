
import { NextResponse } from "next/server";
import { getOpenAI } from "@/services/ai/openai";
import fs from "fs";
import path from "path";



export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { ok: false, error: "No audio file provided" },
        { status: 400 }
      );
    }

    console.log(`Transcribing audio file: ${audioFile.name} `);
    console.log(`File size: ${(audioFile.size / 1024 / 1024).toFixed(2)} MB`);

    // Convert File to buffer
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save temporarily
    const tempDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, audioFile.name);
    fs.writeFileSync(tempFilePath, buffer);

    console.log("Sending to Whisper API...");

    // Transcribe with Whisper
    const openai = await getOpenAI();
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    // Clean up temp file
    fs.unlinkSync(tempFilePath);

    console.log("✅ Transcription complete!");
    console.log(`📝 Duration: ${transcription.duration} seconds`);

    // Extract segments with timestamps
    const segments = (transcription as any).segments || [];
    const formattedTranscript = segments
      .map((seg: any) => {
        const timestamp = new Date(seg.start * 1000).toISOString().substr(11, 8);
        return `[${timestamp}] ${seg.text} `;
      })
      .join("\n");

    return NextResponse.json({
      ok: true,
      transcript: transcription.text,
      formattedTranscript,
      duration: transcription.duration,
      language: transcription.language,
      segments: segments.map((seg: any) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text,
      })),
    });
  } catch (err: any) {
    console.error("Transcription error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Transcription failed",
      },
      { status: 500 }
    );
  }
}

