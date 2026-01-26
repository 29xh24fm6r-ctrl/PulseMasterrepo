// lib/langgraph/tracing.ts
// LangSmith tracing utilities - server only

export interface TraceEnvSnapshot {
  enabled: boolean;
  project: string | null;
  hasKey: boolean;
  endpoint: string | null;
}

/**
 * Returns a snapshot of LangSmith tracing configuration.
 * Useful for debugging and verifying tracing is active.
 */
export function traceEnvSnapshot(): TraceEnvSnapshot {
  return {
    enabled: process.env.LANGCHAIN_TRACING_V2 === "true",
    project: process.env.LANGCHAIN_PROJECT ?? null,
    hasKey: Boolean(process.env.LANGCHAIN_API_KEY),
    endpoint: process.env.LANGCHAIN_ENDPOINT ?? null,
  };
}

/**
 * Check if LangSmith tracing is properly configured
 */
export function isTracingEnabled(): boolean {
  const snapshot = traceEnvSnapshot();
  return snapshot.enabled && snapshot.hasKey;
}
