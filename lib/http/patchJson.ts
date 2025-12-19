// lib/http/patchJson.ts
// Centralized HTTP PATCH helper for consistent error handling

export async function patchJson<T = any>(
  url: string,
  body: unknown
): Promise<{ ok: boolean; status: number; data: T | { error?: string } }> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data: any = {};
  try {
    data = await res.json();
  } catch {
    // If response is not JSON, create error object
    data = { error: `HTTP ${res.status}: ${res.statusText}` };
  }

  return { ok: res.ok, status: res.status, data };
}

