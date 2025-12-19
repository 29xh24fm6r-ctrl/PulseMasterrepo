// Neural Reality Model - Merge All Systems
// lib/neural-reality/model.ts

import { getWorkCortexContextForUser } from "@/lib/cortex/context";
import { processPhysiologySignals, generatePhysiologyInsights } from "@/lib/physiology/engine";
import { scanIdentity } from "@/lib/identity/v3";
import { NeuralRealityState, NeuralInsight, NeuralPrediction, NeuralRecommendation } from "./types";
import { PhysiologySignal } from "@/lib/physiology/types";

/**
 * Build complete Neural Reality state
 */
export async function buildNeuralRealityState(
  userId: string,
  physiologySignals?: PhysiologySignal[]
): Promise<NeuralRealityState> {
  // Build Cortex context
  const cortex = await getWorkCortexContextForUser(userId);

  // Process physiology signals (if available)
  const physiology = physiologySignals
    ? await processPhysiologySignals(userId, physiologySignals)
    : createDefaultPhysiologyState(userId);

  // Get identity profile
  const identityProfile = await scanIdentity(userId, cortex);

  // Extract emotion
  const emotion = {
    detected: cortex.emotion?.detected_emotion || "neutral",
    intensity: cortex.emotion?.intensity || 0.5,
    confidence: 0.8,
  };

  // Extract cognitive state
  const cognitive = {
    load: physiology.cognitiveLoadScore,
    energy: cortex.cognitiveProfile?.currentEnergyLevel || 0.5,
    focus: 1 - physiology.cognitiveLoadScore, // Inverse of cognitive load
  };

  // Extract relational state
  const relationships = cortex.domains.relationships?.keyPeople || [];
  const activeConnections = relationships.filter((p) => p.daysSinceInteraction < 7).length;
  const neglected = relationships.filter((p) => p.daysSinceInteraction > 30);
  const neglectRisk = neglected.length / Math.max(1, relationships.length);

  // Extract temporal state
  const now = new Date();
  const timeOfDay = now.getHours() < 12 ? "morning" : now.getHours() < 18 ? "afternoon" : "evening";
  const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });
  const energyCurve = generateEnergyCurve(cortex, physiology);

  // Generate neural insights
  const insights = generateNeuralInsights(cortex, physiology, identityProfile, cognitive, neglectRisk);

  // Generate predictions
  const predictions = generateNeuralPredictions(cortex, physiology, cognitive, timeOfDay);

  // Generate recommendations
  const recommendations = generateNeuralRecommendations(
    insights,
    predictions,
    cognitive,
    physiology
  );

  return {
    userId,
    timestamp: new Date().toISOString(),
    physiology,
    cortex,
    emotion,
    identity: {
      currentArchetype: identityProfile.currentArchetype,
      transformationProgress: identityProfile.transformationArc?.progress || 0,
    },
    cognitive,
    relational: {
      activeConnections,
      neglectRisk,
    },
    temporal: {
      timeOfDay,
      dayOfWeek,
      energyCurve,
    },
    insights,
    predictions,
    recommendations,
  };
}

/**
 * Create default physiology state when no signals available
 */
function createDefaultPhysiologyState(userId: string): NeuralRealityState["physiology"] {
  return {
    userId,
    timestamp: new Date().toISOString(),
    stressScore: 0.5,
    cognitiveLoadScore: 0.5,
    emotionalDrift: 0,
    burnoutIndex: 0.3,
    readinessScore: 0.7,
    signalCount: 0,
    confidence: 0.3, // Low confidence without signals
  };
}

/**
 * Generate energy curve prediction
 */
function generateEnergyCurve(
  cortex: any,
  physiology: NeuralRealityState["physiology"]
): number[] {
  const curve: number[] = [];
  const currentEnergy = cortex.cognitiveProfile?.currentEnergyLevel || 0.5;
  const currentHour = new Date().getHours();

  // Predict next 8 hours
  for (let i = 0; i < 8; i++) {
    const hour = (currentHour + i) % 24;
    let energy = currentEnergy;

    // Morning boost (6-12)
    if (hour >= 6 && hour < 12) {
      energy = Math.min(1, currentEnergy + 0.2);
    }
    // Afternoon dip (12-18)
    else if (hour >= 12 && hour < 18) {
      energy = Math.max(0.3, currentEnergy - 0.1);
    }
    // Evening low (18-24)
    else {
      energy = Math.max(0.2, currentEnergy - 0.2);
    }

    // Adjust based on stress
    if (physiology.stressScore > 0.7) {
      energy -= 0.1;
    }

    // Adjust based on sleep
    if (physiology.sleepQuality !== undefined && physiology.sleepQuality < 0.5) {
      energy -= 0.1;
    }

    curve.push(Math.max(0, Math.min(1, energy)));
  }

  return curve;
}

/**
 * Generate neural insights
 */
function generateNeuralInsights(
  cortex: any,
  physiology: NeuralRealityState["physiology"],
  identityProfile: any,
  cognitive: NeuralRealityState["cognitive"],
  neglectRisk: number
): NeuralInsight[] {
  const insights: NeuralInsight[] = [];

  // Break needed
  if (physiology.stressScore > 0.7 || physiology.cognitiveLoadScore > 0.8) {
    insights.push({
      type: "break_needed",
      severity: physiology.stressScore > 0.85 ? "high" : "medium",
      description: "You should take a break",
      evidence: [
        `Stress score: ${Math.round(physiology.stressScore * 100)}%`,
        `Cognitive load: ${Math.round(physiology.cognitiveLoadScore * 100)}%`,
      ],
      recommendation: "Step away for 10-15 minutes, practice deep breathing, or take a walk",
      confidence: physiology.confidence,
    });
  }

  // Cognitive overload
  if (physiology.cognitiveLoadScore > 0.8) {
    insights.push({
      type: "cognitive_overload",
      severity: "high",
      description: "Your cognitive load is spiking",
      evidence: [
        `Cognitive load: ${Math.round(physiology.cognitiveLoadScore * 100)}%`,
        `Energy: ${Math.round(cognitive.energy * 100)}%`,
      ],
      recommendation: "Reduce task complexity, focus on one thing, or delegate",
      confidence: physiology.confidence,
    });
  }

  // Emotional avoidance
  const relationships = cortex.domains.relationships?.keyPeople || [];
  const avoided = relationships.filter(
    (p) => p.daysSinceInteraction > 30 && p.relationshipScore > 70
  );
  if (avoided.length > 0 && physiology.emotionalDrift > 0.4) {
    insights.push({
      type: "emotional_avoidance",
      severity: "medium",
      description: "You are emotionally avoiding relationships",
      evidence: [
        `${avoided.length} high-value relationships neglected`,
        `Emotional drift: ${Math.round(physiology.emotionalDrift * 100)}%`,
      ],
      recommendation: "Address emotional barriers and initiate reconnection",
      confidence: 0.7,
    });
  }

  // Pre-burnout trajectory
  if (physiology.burnoutIndex > 0.6) {
    insights.push({
      type: "pre_burnout",
      severity: "high",
      description: "You are in pre-burnout trajectory",
      evidence: [
        `Burnout index: ${Math.round(physiology.burnoutIndex * 100)}%`,
        `Stress: ${Math.round(physiology.stressScore * 100)}%`,
      ],
      recommendation: "Immediately reduce workload, prioritize rest, and seek support",
      confidence: physiology.confidence,
    });
  }

  // Breakthrough window
  if (
    physiology.readinessScore > 0.8 &&
    cognitive.energy > 0.7 &&
    physiology.stressScore < 0.4
  ) {
    insights.push({
      type: "breakthrough_window",
      severity: "low",
      description: "Optimal window for breakthrough work",
      evidence: [
        `Readiness: ${Math.round(physiology.readinessScore * 100)}%`,
        `Energy: ${Math.round(cognitive.energy * 100)}%`,
      ],
      recommendation: "Tackle your most important work now - conditions are optimal",
      confidence: physiology.confidence,
    });
  }

  // Relationship neglect
  if (neglectRisk > 0.3) {
    insights.push({
      type: "relationship_neglect",
      severity: "medium",
      description: "Relationship neglect detected",
      evidence: [
        `Neglect risk: ${Math.round(neglectRisk * 100)}%`,
        `${relationships.length} total relationships`,
      ],
      recommendation: "Prioritize reconnection with key relationships",
      confidence: 0.8,
    });
  }

  // Identity misalignment
  const identityTension = identityProfile.identityTension;
  if (identityTension && identityTension.intensity > 0.6) {
    insights.push({
      type: "identity_misalignment",
      severity: "medium",
      description: "Identity tension detected",
      evidence: [identityTension.description],
      recommendation: "Explore integration practices to resolve identity tension",
      confidence: 0.7,
    });
  }

  // Energy optimization
  const energyCurve = generateEnergyCurve(cortex, physiology);
  const peakEnergy = Math.max(...energyCurve);
  const peakIndex = energyCurve.indexOf(peakEnergy);
  if (peakEnergy > 0.7 && peakIndex > 0) {
    const peakHour = new Date().getHours() + peakIndex;
    insights.push({
      type: "energy_optimization",
      severity: "low",
      description: `Energy curve predicts peak at ${peakHour}:00`,
      evidence: [`Peak energy: ${Math.round(peakEnergy * 100)}%`],
      recommendation: `Schedule important work for ${peakHour}:00 when energy peaks`,
      confidence: 0.6,
    });
  }

  return insights;
}

/**
 * Generate neural predictions
 */
function generateNeuralPredictions(
  cortex: any,
  physiology: NeuralRealityState["physiology"],
  cognitive: NeuralRealityState["cognitive"],
  timeOfDay: string
): NeuralPrediction[] {
  const predictions: NeuralPrediction[] = [];

  // Energy curve prediction
  const energyCurve = generateEnergyCurve(cortex, physiology);
  const peakIndex = energyCurve.indexOf(Math.max(...energyCurve));
  const peakHour = new Date().getHours() + peakIndex;
  predictions.push({
    type: "energy_curve",
    timeframe: `${peakHour}:00`,
    probability: 0.7,
    description: `Energy will peak at ${peakHour}:00`,
    confidence: 0.6,
  });

  // Breakthrough window
  if (physiology.readinessScore > 0.75 && cognitive.energy > 0.7) {
    const windowHour = new Date().getHours() + 1;
    predictions.push({
      type: "breakthrough_window",
      timeframe: `${windowHour}:00 - ${windowHour + 2}:00`,
      probability: 0.8,
      description: "Optimal breakthrough window predicted",
      confidence: physiology.confidence,
    });
  }

  // Burnout trajectory
  if (physiology.burnoutIndex > 0.6) {
    predictions.push({
      type: "burnout_trajectory",
      timeframe: "next 3-7 days",
      probability: physiology.burnoutIndex,
      description: "High risk of burnout if current patterns continue",
      confidence: physiology.confidence,
    });
  }

  // Relationship decay
  const relationships = cortex.domains.relationships?.keyPeople || [];
  const atRisk = relationships.filter(
    (p) => p.daysSinceInteraction > 20 && p.daysSinceInteraction < 30
  );
  if (atRisk.length > 0) {
    predictions.push({
      type: "relationship_decay",
      timeframe: "next 7-14 days",
      probability: 0.6,
      description: `${atRisk.length} relationships at risk of decay`,
      confidence: 0.7,
    });
  }

  return predictions;
}

/**
 * Generate neural recommendations
 */
function generateNeuralRecommendations(
  insights: NeuralInsight[],
  predictions: NeuralPrediction[],
  cognitive: NeuralRealityState["cognitive"],
  physiology: NeuralRealityState["physiology"]
): NeuralRecommendation[] {
  const recommendations: NeuralRecommendation[] = [];

  // High-priority insights become recommendations
  const highPriorityInsights = insights.filter((i) => i.severity === "high");
  for (const insight of highPriorityInsights.slice(0, 3)) {
    recommendations.push({
      type: insight.type === "break_needed" ? "rest" : "action",
      priority: "high",
      title: insight.description,
      description: insight.recommendation,
      timeframe: "now",
      confidence: insight.confidence,
    });
  }

  // Breakthrough window recommendation
  const breakthroughWindow = predictions.find((p) => p.type === "breakthrough_window");
  if (breakthroughWindow) {
    recommendations.push({
      type: "focus",
      priority: "high",
      title: "Schedule Deep Work",
      description: `Optimal window: ${breakthroughWindow.timeframe}`,
      timeframe: breakthroughWindow.timeframe,
      confidence: breakthroughWindow.confidence,
    });
  }

  // Energy optimization
  if (cognitive.energy < 0.4) {
    recommendations.push({
      type: "rest",
      priority: "medium",
      title: "Energy Recovery",
      description: "Take a break to recover energy",
      timeframe: "next 30 minutes",
      confidence: 0.8,
    });
  }

  return recommendations;
}



