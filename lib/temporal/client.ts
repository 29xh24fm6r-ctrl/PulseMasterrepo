// lib/temporal/client.ts
// Temporal client for starting and querying workflows

import { Connection, Client } from "@temporalio/client";

let cachedClient: Client | null = null;

/**
 * Get or create a Temporal client
 * Caches the connection for reuse across requests
 */
export async function temporalClient(): Promise<Client> {
  if (cachedClient) {
    return cachedClient;
  }

  const address = process.env.TEMPORAL_ADDRESS || "localhost:7233";
  const namespace = process.env.TEMPORAL_NAMESPACE || "default";

  const connection = await Connection.connect({ address });
  cachedClient = new Client({ connection, namespace });

  return cachedClient;
}

/**
 * Get the task queue name for Omega workflows
 */
export function getOmegaTaskQueue(): string {
  return process.env.TEMPORAL_TASK_QUEUE || "pulse-omega";
}

/**
 * Generate a deterministic workflow ID for a signal
 * Ensures idempotency - same signal always gets same workflow ID
 */
export function signalWorkflowId(signalId: string): string {
  return `omega-signal-${signalId}`;
}
