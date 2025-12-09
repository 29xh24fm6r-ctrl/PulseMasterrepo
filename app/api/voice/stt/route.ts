import { NextRequest, NextResponse } from "next/server";

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || "f8d6272d6353f31cac82d3b10e5b67a9840f2cfb";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as Blob;

    if (!audioFile) {
      return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
    }

    const audioBuffer = await audioFile.arrayBuffer();

    console.log("Sending to Deepgram:", { 
      size: audioBuffer.byteLength, 
      type: audioFile.type 
    });

    // Use simpler Deepgram settings with auto-detection
    const response = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&language=en&punctuate=true&smart_format=true",
      {
        method: "POST",
        headers: {
          "Authorization": `Token ${DEEPGRAM_API_KEY}`,
          "Content-Type": audioFile.type || "audio/webm",
        },
        body: audioBuffer,
      }
    );

    const responseText = await response.text();
    console.log("Deepgram raw response:", responseText.substring(0, 500));

    if (!response.ok) {
      console.error("Deepgram error:", responseText);
      return NextResponse.json(
        { error: "Failed to transcribe audio", details: responseText },
        { status: response.status }
      );
    }

    const result = JSON.parse(responseText);
    const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
    
    console.log("Transcript extracted:", transcript);

    return NextResponse.json({
      transcript,
      confidence: result.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0,
    });
  } catch (error) {
    console.error("STT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    websocketUrl: "wss://api.deepgram.com/v1/listen",
  });
}