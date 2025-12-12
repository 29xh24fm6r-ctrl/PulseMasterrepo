// Neural Reality Model Types
// lib/neural-reality/types.ts

import { PhysiologyState } from "@/lib/physiology/types";
import { PulseCortexContext } from "@/lib/cortex/types";

export interface NeuralRealityState {
  userId: string;
  timestamp: string;

  // Merged state from all systems
  physiology: PhysiologyState;
  cortex: PulseCortexContext;
  emotion: {
    detected: string;
    intensity: number;
    confidence: number;
  };
  identity: {
    currentArchetype: string;
    transformationProgress: number;
  };
  cognitive: {
    load: number;
    energy: number;
    focus: number;
  };
  relational: {
    activeConnections: number;
    neglectRisk: number;
  };
  temporal: {
    timeOfDay: string;
    dayOfWeek: string;
    energyCurve: number[];
  };

  // Neural insights
  insights: NeuralInsight[];
  predictions: NeuralPrediction[];
  recommendations: NeuralRecommendation[];
}

export interface NeuralInsight {
  type:
    | "break_needed"
    | "cognitive_overload"
    | "emotional_avoidance"
    | "pre_burnout"
    | "breakthrough_window"
    | "relationship_neglect"
    | "identity_misalignment"
    | "energy_optimization";
  severity: "low" | "medium" | "high";
  description: string;
  evidence: string[];
  recommendation: string;
  confidence: number;
}

export interface NeuralPrediction {
  type: "energy_curve" | "breakthrough_window" | "burnout_trajectory" | "relationship_decay";
  timeframe: string; // e.g., "2:45 PM", "next 3 days"
  probability: number; // 0-1
  description: string;
  confidence: number;
}

export interface NeuralRecommendation {
  type: "action" | "rest" | "focus" | "connect" | "reflect";
  priority: "low" | "medium" | "high";
  title: string;
  description: string;
  timeframe: string;
  confidence: number;
}



