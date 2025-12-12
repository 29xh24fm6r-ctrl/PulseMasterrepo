/**
 * Feature flags for Pulse OS
 */

export const FEATURES = {
  NOTION: process.env.FEATURE_NOTION === "true",
  BETA_MODE: process.env.PULSE_BETA_MODE === "true",
} as const;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  return FEATURES[feature];
}

/**
 * Require a feature to be enabled, throw error if not
 */
export function requireFeature(feature: keyof typeof FEATURES): void {
  if (!FEATURES[feature]) {
    throw new Error(`Feature "${feature}" is not enabled`);
  }
}

