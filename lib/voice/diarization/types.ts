// Speaker Diarization Types
// lib/voice/diarization/types.ts

export interface DiarizationSegment {
  speakerLabel: string; // "SPEAKER_1", "SPEAKER_2", etc.
  start: number; // seconds
  end: number; // seconds
  transcript: string; // partial transcript for this segment
  audioUrl?: string; // optional sliced audio URL
}

export interface SpeakerEmbedding {
  embedding: number[]; // vector(768)
  transcript: string;
}

