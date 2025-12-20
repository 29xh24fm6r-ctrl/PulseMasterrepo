// lib/simulation/client/drilldown.ts
"use client";

export type DrillStep = {
  id: string;
  title: string;
  ok: boolean;
  severity: "ok" | "warn" | "error";
  pathId?: string | null;
  detail?: string | null;
  duration_ms?: number | null;
  data?: any;
};

export type DrillSummary = {
  total: number;
  ok: number;
  error: number;
  warn: number;
  topError: string | null;
};

/**
 * Best-effort normalization across different result shapes.
 * Supports:
 * - { steps: [{ ok, title, detail, pathId, duration_ms, data }] }
 * - { result: { steps: [...] } }
 * - { timeline: [...] }
 * - fallback: single step with whole payload
 */
export function extractDrillSteps(result: any): DrillStep[] {
  const r = result?.result ?? result ?? null;

  const candidate =
    Array.isArray(r?.steps) ? r.steps :
    Array.isArray(r?.timeline) ? r.timeline :
    Array.isArray(r?.events) ? r.events :
    null;

  if (Array.isArray(candidate)) {
    return candidate.map((s: any, idx: number) => {
      const ok =
        typeof s?.ok === "boolean" ? s.ok :
        s?.status === "success" ? true :
        s?.status === "ok" ? true :
        s?.level === "error" ? false :
        s?.error ? false :
        true;

      const title =
        (typeof s?.title === "string" && s.title) ||
        (typeof s?.name === "string" && s.name) ||
        (typeof s?.event === "string" && s.event) ||
        `Step ${idx + 1}`;

      const detail =
        (typeof s?.detail === "string" && s.detail) ||
        (typeof s?.message === "string" && s.message) ||
        (typeof s?.error === "string" && s.error) ||
        null;

      const duration_ms =
        typeof s?.duration_ms === "number" ? s.duration_ms :
        typeof s?.ms === "number" ? s.ms :
        null;

      const severity: DrillStep["severity"] =
        ok ? "ok" : "error";

      return {
        id: (typeof s?.id === "string" && s.id) || `${idx}`,
        title,
        ok,
        severity,
        pathId: (typeof s?.pathId === "string" && s.pathId) || (typeof s?.path_id === "string" && s.path_id) || null,
        detail,
        duration_ms,
        data: s?.data ?? s,
      };
    });
  }

  // Fallback to one step
  const fallbackOk =
    typeof r?.ok === "boolean" ? r.ok :
    typeof result?.ok === "boolean" ? result.ok :
    true;

  return [
    {
      id: "0",
      title: "Run Result",
      ok: fallbackOk,
      severity: fallbackOk ? "ok" : "error",
      detail: null,
      duration_ms: null,
      data: r,
    },
  ];
}

export function buildDrillSummary(steps: DrillStep[]): DrillSummary {
  let ok = 0, error = 0, warn = 0;
  let topError: string | null = null;

  for (const s of steps) {
    if (s.severity === "error" || !s.ok) {
      error++;
      if (!topError && s.detail) topError = s.detail;
    } else if (s.severity === "warn") {
      warn++;
    } else {
      ok++;
    }
  }

  return {
    total: steps.length,
    ok,
    error,
    warn,
    topError,
  };
}

