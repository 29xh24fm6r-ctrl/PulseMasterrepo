// intelligence/types.ts
// Shared types for the intelligence generation pipeline.

export interface GeneratedSignal {
  signal_type: string;
  summary: string;
  confidence: number;
  evidence: { event_ids: string[] };
  first_detected_at: string;
  last_detected_at: string;
  topic_hash?: string;
}

export interface InferredIntent {
  intent_type: string;
  confidence: number;
  source_signal_ids: string[];
}

export interface IntelligenceResult {
  ok: boolean;
  generated: {
    signals: number;
    intents: number;
    proposals: number;
  };
  errors: string[];
}

export type SignalGenerator = (userId: string) => Promise<GeneratedSignal[]>;
