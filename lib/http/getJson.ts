// lib/http/getJson.ts
// Centralized HTTP GET helper for consistent error handling

export async function getJson<T = any>(
  url: string
): Promise<{ ok: boolean; status: number; data: T | { error?: string } }> {
  const res = await fetch(url, { method: "GET" });

  let data: any = {};
  try {
    data = await res.json();
  } catch {
    // If response is not JSON, create error object
    data = { error: `HTTP ${res.status}: ${res.statusText}` };
  }

  return { ok: res.ok, status: res.status, data };
}

