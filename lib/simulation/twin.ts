// Digital Twin Model
// lib/simulation/twin.ts

export interface DigitalTwinState {
  energy: number;                  // 0–100
  stress: number;                  // 0–100
  mood: number;                    // -50 to +50
  emotional_resilience: number;    // 0–100

  career_velocity: number;         // 0–100
  sales_pipeline_health: number;   // 0–100
  relationship_stability: number;  // 0–100
  growth_momentum: number;         // 0–100

  habit_consistency: number;       // 0–100
  sleep_quality: number;           // 0–100
  focus_capacity: number;          // 0–100

  arc_momentum: {
    healing: number;
    career: number;
    performance: number;
    identity: number;
    financial: number;
  };

  risk: {
    burnout: number;
    relapse: number;
    conflict: number;
  };

  timestamp: string;
}

/**
 * Clamp value to range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Create default digital twin state
 */
export function createDefaultTwin(): DigitalTwinState {
  return {
    energy: 50,
    stress: 50,
    mood: 0,
    emotional_resilience: 50,

    career_velocity: 50,
    sales_pipeline_health: 50,
    relationship_stability: 50,
    growth_momentum: 50,

    habit_consistency: 50,
    sleep_quality: 50,
    focus_capacity: 50,

    arc_momentum: {
      healing: 0,
      career: 0,
      performance: 0,
      identity: 0,
      financial: 0,
    },

    risk: {
      burnout: 0,
      relapse: 0,
      conflict: 0,
    },

    timestamp: new Date().toISOString(),
  };
}

/**
 * Update twin state with bounds checking
 */
export function updateTwinState(
  state: DigitalTwinState,
  updates: Partial<DigitalTwinState>
): DigitalTwinState {
  const updated = { ...state, ...updates };

  // Clamp all values to valid ranges
  updated.energy = clamp(updated.energy, 0, 100);
  updated.stress = clamp(updated.stress, 0, 100);
  updated.mood = clamp(updated.mood, -50, 50);
  updated.emotional_resilience = clamp(updated.emotional_resilience, 0, 100);

  updated.career_velocity = clamp(updated.career_velocity, 0, 100);
  updated.sales_pipeline_health = clamp(updated.sales_pipeline_health, 0, 100);
  updated.relationship_stability = clamp(updated.relationship_stability, 0, 100);
  updated.growth_momentum = clamp(updated.growth_momentum, 0, 100);

  updated.habit_consistency = clamp(updated.habit_consistency, 0, 100);
  updated.sleep_quality = clamp(updated.sleep_quality, 0, 100);
  updated.focus_capacity = clamp(updated.focus_capacity, 0, 100);

  // Clamp arc momentum
  updated.arc_momentum = {
    healing: clamp(updated.arc_momentum?.healing || 0, 0, 100),
    career: clamp(updated.arc_momentum?.career || 0, 0, 100),
    performance: clamp(updated.arc_momentum?.performance || 0, 0, 100),
    identity: clamp(updated.arc_momentum?.identity || 0, 0, 100),
    financial: clamp(updated.arc_momentum?.financial || 0, 0, 100),
  };

  // Clamp risks
  updated.risk = {
    burnout: clamp(updated.risk?.burnout || 0, 0, 100),
    relapse: clamp(updated.risk?.relapse || 0, 0, 100),
    conflict: clamp(updated.risk?.conflict || 0, 0, 100),
  };

  updated.timestamp = new Date().toISOString();

  return updated;
}




