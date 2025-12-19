// lib/http/postJson.ts
// Centralized HTTP POST helper to prevent silent failures and ensure consistent error handling

export async function postJson<T = any>(
  url: string,
  body: unknown
): Promise<{ ok: boolean; status: number; data: T | { error?: string } }> {
  const res = await fetch(url, {
    method: "POST",
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

