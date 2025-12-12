// Audio Capture Types
// lib/comms/audio/types.ts

export type AudioSource = "live" | "upload" | "call_recording" | "ambient";

export interface AudioIngestInput {
  userId: string;
  audioUrl: string; // public or signed URL
  durationSeconds: number;
  source: AudioSource;
  occurredAt: Date;
  metadata?: {
    title?: string;
    participants?: string[];
    location?: string;
    meetingType?: string;
  };
}

