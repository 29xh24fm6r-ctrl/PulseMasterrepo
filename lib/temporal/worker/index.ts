// lib/temporal/worker/index.ts
// Temporal worker that runs Omega workflows and activities
//
// Registered workflows:
// - omegaSignalWorkflow (legacy)
// - scheduledOmegaSignalWorkflow (legacy)
// - OmegaTrustWorkflow (canonical - Phase 1)

import { Worker, NativeConnection } from "@temporalio/worker";
import * as activities from "../activities";
import path from "path";

/**
 * Run the Temporal worker for Omega workflows
 *
 * The worker:
 * - Connects to Temporal server
 * - Registers workflow definitions (legacy + OmegaTrustWorkflow)
 * - Registers activity implementations
 * - Polls for and executes work
 */
export async function runTemporalWorker(): Promise<void> {
  const address = process.env.TEMPORAL_ADDRESS || "localhost:7233";
  const namespace = process.env.TEMPORAL_NAMESPACE || "default";
  const taskQueue = process.env.TEMPORAL_TASK_QUEUE || "pulse-omega";

  console.log(`[TemporalWorker] Connecting to ${address} (namespace: ${namespace})`);

  const connection = await NativeConnection.connect({ address });

  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue,
    // Load all workflows from index (legacy + OmegaTrustWorkflow)
    workflowsPath: path.resolve(__dirname, "../workflows/index"),
    activities,
  });

  console.log(`[TemporalWorker] Started on task queue: ${taskQueue}`);
  console.log(`[TemporalWorker] Registered workflows: omegaSignalWorkflow, scheduledOmegaSignalWorkflow, OmegaTrustWorkflow`);
  console.log(`[TemporalWorker] Registered activities:`, Object.keys(activities));

  // Run until shutdown signal
  await worker.run();
}

/**
 * Create a worker for testing (doesn't auto-run)
 */
export async function createTemporalWorker() {
  const address = process.env.TEMPORAL_ADDRESS || "localhost:7233";
  const namespace = process.env.TEMPORAL_NAMESPACE || "default";
  const taskQueue = process.env.TEMPORAL_TASK_QUEUE || "pulse-omega";

  const connection = await NativeConnection.connect({ address });

  return Worker.create({
    connection,
    namespace,
    taskQueue,
    workflowsPath: path.resolve(__dirname, "../workflows/index"),
    activities,
  });
}

// Allow direct execution: node lib/temporal/worker/index.ts
if (require.main === module) {
  runTemporalWorker().catch((err) => {
    console.error("[TemporalWorker] Fatal error:", err);
    process.exit(1);
  });
}
