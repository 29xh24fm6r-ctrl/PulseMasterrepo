// Pulse Physiology Engine Types
// lib/physiology/types.ts

export interface PhysiologySignal {
  type:
    | "heart_rate"
    | "hrv"
    | "sleep_cycle"
    | "respiration"
    | "pupil_dilation"
    | "facial_expression"
    | "speech_energy"
    | "speech_cadence";
  value: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface PhysiologyState {
  userId: string;
  timestamp: string;

  // Raw signals
  heartRate?: number; // BPM
  hrv?: number; // Heart rate variability (ms)
  sleepQuality?: number; // 0-1
  respirationRate?: number; // breaths per minute
  pupilDilation?: number; // 0-1
  facialExpression?: {
    emotion: string;
    intensity: number;
    microExpressions: string[];
  };
  speechEnergy?: number; // 0-1
  speechCadence?: number; // words per minute

  // Derived scores
  stressScore: number; // 0-1
  cognitiveLoadScore: number; // 0-1
  emotionalDrift: number; // 0-1, how much emotion is shifting
  burnoutIndex: number; // 0-1
  readinessScore: number; // 0-1, how ready for high-performance work

  // Metadata
  signalCount: number;
  confidence: number; // 0-1, how confident in the readings
}

export interface PhysiologyInsight {
  type:
    | "stress_alert"
    | "cognitive_overload"
    | "burnout_risk"
    | "readiness_peak"
    | "emotional_shift"
    | "recovery_needed"
    | "flow_state_detected";
  severity: "low" | "medium" | "high";
  description: string;
  recommendation: string;
  confidence: number;
}



