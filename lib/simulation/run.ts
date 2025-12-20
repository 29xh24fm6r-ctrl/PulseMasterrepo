// lib/simulation/run.ts
// Client-safe facade - redirects to API route

/**
 * Client-safe facade.
 * If someone tries to call simulation directly from client, they must use the API.
 * 
 * This file exists to prevent accidental client-side imports of server-only code.
 * All simulation execution should go through /api/simulation/paths/run
 */

export async function runSimulationClientSafe() {
  throw new Error(
    "Simulation must be run server-side. Use POST /api/simulation/paths/run."
  );
}

// Re-export types that are safe for client
export type { SimulationInput, SimulationStep } from "./scenario";
export type { DigitalTwinState } from "./twin";
