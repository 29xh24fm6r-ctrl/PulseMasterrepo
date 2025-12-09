import { NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { youtubeUrl } = body;

    if (!youtubeUrl) {
      return NextResponse.json(
        { ok: false, error: "Missing YouTube URL" },
        { status: 400 }
      );
    }

    console.log(`📝 Fetching YouTube transcript: ${youtubeUrl}`);

    // Extract video ID
    let videoId = "";
    
    if (youtubeUrl.includes("youtube.com/watch?v=")) {
      videoId = youtubeUrl.split("v=")[1]?.split("&")[0] || "";
    } else if (youtubeUrl.includes("youtu.be/")) {
      videoId = youtubeUrl.split("youtu.be/")[1]?.split("?")[0] || "";
    }

    if (!videoId) {
      return NextResponse.json(
        { ok: false, error: "Invalid YouTube URL" },
        { status: 400 }
      );
    }

    // Get transcript
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);

    if (!transcriptItems || transcriptItems.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No transcript available for this video. Try uploading an audio file instead." },
        { status: 404 }
      );
    }

    // Combine transcript
    const fullTranscript = transcriptItems
      .map((item: any) => item.text)
      .join(" ")
      .replace(/\[Music\]/g, "")
      .replace(/\[Applause\]/g, "")
      .trim();

    // Calculate approximate duration (last item's offset)
    const lastItem = transcriptItems[transcriptItems.length - 1];
    const durationSeconds = lastItem.offset ? Math.floor(lastItem.offset / 1000) : 0;
    const durationMinutes = Math.floor(durationSeconds / 60);

    console.log(`✅ Transcript fetched! Length: ${fullTranscript.length} chars`);
    console.log(`⏱️ Duration: ~${durationMinutes} minutes`);

    // Try to get video title from URL (basic)
    let title = `YouTube Video - ${videoId}`;
    
    return NextResponse.json({
      ok: true,
      title: title,
      duration: durationMinutes,
      transcript: fullTranscript,
      url: youtubeUrl,
      method: "transcript",
    });
  } catch (err: any) {
    console.error("YouTube transcript error:", err?.message ?? err);
    
    let errorMessage = "Failed to fetch transcript";
    
    if (err?.message?.includes("Transcript is disabled")) {
      errorMessage = "This video has transcripts disabled. Try uploading an audio file instead.";
    } else if (err?.message?.includes("Could not find")) {
      errorMessage = "No transcript available for this video. Try a different video or upload an audio file.";
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