// lib/simulation/client/runsApi.ts
"use client";

export type SimulationRunRow = {
  id: string;
  user_id: string;
  request_id: string;
  route: string;
  mode: string;
  deal_id: string | null;
  path_ids: string[] | null;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  error: string | null;
};

export type SimulationRunDetail = SimulationRunRow & {
  input: any;
  result: any;
};

export async function fetchSimulationRuns(limit = 20): Promise<SimulationRunRow[]> {
  const res = await fetch(`/api/simulation/runs?limit=${encodeURIComponent(String(limit))}`, {
    method: "GET",
    headers: { "Accept": "application/json" },
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as any;
  if (!json?.ok) throw new Error(json?.error || "Failed to fetch runs");
  return (json.runs || []) as SimulationRunRow[];
}

export async function fetchSimulationRun(runId: string): Promise<SimulationRunDetail> {
  const res = await fetch(`/api/simulation/runs/${encodeURIComponent(runId)}`, {
    method: "GET",
    headers: { "Accept": "application/json" },
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as any;
  if (!json?.ok) throw new Error(json?.error || "Failed to fetch run");
  return json.run as SimulationRunDetail;
}

export async function rerunSimulationRun(runId: string): Promise<any> {
  const res = await fetch(`/api/simulation/runs/${encodeURIComponent(runId)}/rerun`, {
    method: "POST",
    headers: { "Accept": "application/json" },
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as any;
  if (!json?.ok) throw new Error(json?.error || "Rerun failed");
  return json.result;
}

export function downloadJson(filename: string, obj: any) {
  const blob = new Blob([JSON.stringify(obj ?? {}, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

