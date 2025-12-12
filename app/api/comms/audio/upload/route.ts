// Audio Upload API
// app/api/comms/audio/upload/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ingestAudioCapture, ingestAudioWithTranscript } from "@/lib/comms/audio/ingest";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const transcript = formData.get("transcript") as string | null;
    const source = (formData.get("source") as string) || "upload";
    const title = formData.get("title") as string | null;
    const participants = formData.get("participants") as string | null;
    const occurredAt = formData.get("occurredAt") as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 }
      );
    }

    // TODO: Upload audio file to storage (S3, Supabase Storage, etc.)
    // For now, we'll use a placeholder URL
    // In production, upload to Supabase Storage or S3
    const audioUrl = `placeholder://audio/${audioFile.name}`;

    // Get duration (approximate)
    const durationSeconds = 0; // Would need audio analysis to get real duration

    const metadata = {
      title: title || null,
      participants: participants ? participants.split(",").map((p) => p.trim()) : [],
      location: null,
      meetingType: null,
    };

    let commMessageId: string;

    if (transcript) {
      // Use provided transcript
      commMessageId = await ingestAudioWithTranscript({
        userId,
        audioUrl,
        transcript,
        durationSeconds,
        source: source as any,
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
        metadata,
      });
    } else {
      // Auto-transcribe
      commMessageId = await ingestAudioCapture({
        userId,
        audioUrl,
        durationSeconds,
        source: source as any,
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
        metadata,
      });
    }

    return NextResponse.json({
      success: true,
      commMessageId,
    });
  } catch (err: any) {
    console.error("[AudioUpload] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to upload audio" },
      { status: 500 }
    );
  }
}

