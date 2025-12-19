import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type JobOutcome = "succeeded" | "failed" | "retry";

/**
 * Extract provider from job payload/metadata
 * Standardizes provider extraction across the codebase
 */
export function extractProvider(payload: any, jobType?: string): string | null {
  // Preferred: job.payload.provider
  if (payload?.provider && typeof payload.provider === "string") {
    return payload.provider;
  }

  // Alternate: job.payload.meta.provider
  if (payload?.meta?.provider && typeof payload.meta.provider === "string") {
    return payload.meta.provider;
  }

  // Fallback: infer from job_type (integration layer patterns)
  if (jobType) {
    if (jobType.includes("azure") || jobType.includes("document_intelligence")) {
      return "azure_document_intelligence";
    }
    if (jobType.includes("openai") || jobType.includes("gpt")) {
      return "openai";
    }
    if (jobType.includes("anthropic") || jobType.includes("claude")) {
      return "anthropic";
    }
    if (jobType.includes("c4") || jobType.includes("c8")) {
      return jobType.split(".")[0] || "c8";
    }
  }

  return null;
}

/**
 * Compute adaptive retry delay based on provider health (C10)
 */
export async function computeAdaptiveDelay(
  provider: string | null,
  baseDelaySeconds: number,
  maxDelaySeconds: number = 3600
): Promise<number> {
  if (!provider) {
    return baseDelaySeconds;
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("job_queue_adaptive_delay_c10", {
      p_provider: provider,
      p_base_delay_seconds: baseDelaySeconds,
      p_max_delay_seconds: maxDelaySeconds,
    });

    if (error) {
      console.warn(`Adaptive delay computation failed for ${provider}:`, error.message);
      return baseDelaySeconds;
    }

    return data?.[0]?.delay_seconds ?? baseDelaySeconds;
  } catch (e) {
    console.warn(`Adaptive delay computation error for ${provider}:`, e);
    return baseDelaySeconds;
  }
}

export async function startJobC8(jobId: string, workerId: string) {
  const { data, error: rpcErr } = await supabaseAdmin.rpc("job_queue_start_c8", {
    p_job_id: jobId,
    p_worker_id: workerId,
  });

  if (rpcErr) throw rpcErr;
  return data?.[0] ?? null;
}

export async function completeJobC8(args: {
  jobId: string;
  workerId: string;
  outcome: JobOutcome;
  error?: string | null;
  output?: unknown;
  meta?: Record<string, unknown>;
}) {
  const { jobId, workerId, outcome, error, output, meta } = args;

  const { data, error: rpcErr } = await supabaseAdmin.rpc("job_queue_complete_c8", {
    p_job_id: jobId,
    p_worker_id: workerId,
    p_outcome: outcome,
    p_error: error ?? null,
    p_output: (output ?? null) as any,
    p_meta: meta ?? {},
  });

  if (rpcErr) throw rpcErr;
  return data?.[0] ?? null;
}

