import { NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

// const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function POST(req: Request) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  try {
    const body = await req.json();
    const { youtubeUrl } = body;

    if (!youtubeUrl) {
      return NextResponse.json(
        { ok: false, error: "Missing YouTube URL" },
        { status: 400 }
      );
    }

    console.log(`🎥 Processing YouTube video: ${youtubeUrl}`);

    // Validate URL
    if (!ytdl.validateURL(youtubeUrl)) {
      return NextResponse.json(
        { ok: false, error: "Invalid YouTube URL" },
        { status: 400 }
      );
    }

    // Get video info with options to bypass restrictions
    const info = await ytdl.getInfo(youtubeUrl, {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
    });

    const videoTitle = info.videoDetails.title;
    const videoDuration = parseInt(info.videoDetails.lengthSeconds);

    console.log(`📹 Title: ${videoTitle}`);
    console.log(`⏱️ Duration: ${Math.floor(videoDuration / 60)} minutes`);

    // Check if video is too long (over 30 minutes)
    if (videoDuration > 1800) {
      return NextResponse.json(
        { ok: false, error: "Video is too long (max 30 minutes). Try a shorter video or upload audio file." },
        { status: 400 }
      );
    }

    // Create temp directory
    const tempDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Download audio
    const audioPath = path.join(tempDir, `${Date.now()}.mp3`);
    console.log("🎵 Downloading audio...");

    await new Promise<void>((resolve, reject) => {
      const stream = ytdl(youtubeUrl, {
        quality: "lowestaudio",
        filter: "audioonly",
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        },
      });

      stream.pipe(fs.createWriteStream(audioPath))
        .on("finish", () => resolve())
        .on("error", (err) => reject(err));

      stream.on("error", (err) => reject(err));
    });

    console.log("✅ Audio downloaded");
    console.log("🎤 Transcribing with Whisper...");

    // Check file size (Whisper has 25MB limit)
    const stats = fs.statSync(audioPath);
    const fileSizeMB = stats.size / (1024 * 1024);

    if (fileSizeMB > 24) {
      fs.unlinkSync(audioPath);
      return NextResponse.json(
        { ok: false, error: "Audio file too large for transcription. Try a shorter video." },
        { status: 400 }
      );
    }

    console.log(`📦 File size: ${fileSizeMB.toFixed(2)} MB`);

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "whisper-1",
    });

    // Clean up audio file
    fs.unlinkSync(audioPath);

    console.log("✅ Transcription complete!");

    return NextResponse.json({
      ok: true,
      title: videoTitle,
      duration: Math.floor(videoDuration / 60),
      transcript: transcription.text,
      url: youtubeUrl,
    });
  } catch (err: any) {
    console.error("YouTube processing error:", err?.message ?? err);

    // Better error messages
    let errorMessage = "Failed to process YouTube video";

    if (err?.message?.includes("410")) {
      errorMessage = "This video is restricted or unavailable. Try a different public video or upload an audio file instead.";
    } else if (err?.message?.includes("403")) {
      errorMessage = "Access denied to this video. Try a different public video.";
    } else if (err?.message?.includes("404")) {
      errorMessage = "Video not found. Check the URL and try again.";
    }

    return NextResponse.json(
      {
        ok: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
